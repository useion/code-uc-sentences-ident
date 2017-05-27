var Promise = require('promise');
var zerorpc = require("zerorpc");
//var beep = require('node-beep');
var fs = require('fs');
var similarity = require("similarity");
var util = require('util');
var argv = require('minimist')(process.argv.slice(2));


var useion = require("./../useion/lib/parser");
var utils = require("./../useion/lib/helpers/utils.js");
var func = require("./functions.js");
var db = require("./database.js");


var counter = 0;
var start = Date.now();
var client = new zerorpc.Client();

var method = 'issue';
var comparison = 'simple';
var usecase_file = "PlaceOrder.md";
var code_file = "PlaceOrder_code01.php";
var database = "twenty";


function main(){

    // setting options from arguments
    setArg();

    var promise_set = [];

    // parsing use case from the file
    var useCaseParser = new useion.Usecase();
    var parser_usecase = useCaseParser.parse(usecase_file);
    var usecase_steps_raw = parser_usecase.steps;
    var usecase_name = parser_usecase.name;

    // setting up RPC client
    client.connect("tcp://127.0.0.1:4242");

    // opening database
    //db.openDB(database);
    if (method === 'issue'){
        db.openDB("./"+usecase_name.replace(" ","")+".db");
    }

    //console.log(usecase_steps_raw);

    // simplify use case steps
    for (var i in usecase_steps_raw){
        promise_set.push(getSentence(usecase_steps_raw[i].orig_name));
    }

    // open file with code
    openFile(code_file).then(function(file_data){

        // continue only after finishing simplifying use case steps
        Promise.all(promise_set).then(function(usecase_steps_parsed){
            console.log(medzicas()+" PARSED USE CASE STEPS:");
            console.log(usecase_steps_parsed);

            var fragment_task_array = [];

            // push every use case step into sequence
            for (var i in usecase_steps_parsed){

                fragment_task_array.push(fragmentTask(file_data, usecase_steps_parsed[i]));
            }

            var result_promise = sequence(fragment_task_array,function(result){

                var mapped = {name:usecase_name,steps:[]};

                for (var i in result){
                    var one_step = result[i];
                    var step_number = one_step[0].usecase.match(/[0-9a-zA-Z]+\./)[0];
                    var step = one_step[0].usecase.replace(/[0-9a-zA-Z]+\./,"").trim();
                    var method_set = [];

                    for (var j in one_step){
                        var method_name = one_step[j].method;
                        var path = one_step[j].file;
                        var class_name = one_step[j].class;
                        var similarity = one_step[j].rating;

                        method_set.push({path:path, className:class_name, methodName:method_name, similarity:similarity});
                    }

                    mapped.steps.push({stepNumber:step_number, step:step, methods:method_set});
                }

                //beep(2);
                console.log(medzicas()+" ARGUMENTS");
                console.log(argv);
                console.log(medzicas()+" RESULTS ("+counter+")");

                console.log(result);
                console.log(code_file);
                console.log(code_file.replace(/\//g,"_").replace(".","_"));
                writeToFile(usecase_name.replace(" ","")+"_"+method+"_"+comparison+"_"+code_file.replace(/\//g,"_").replace(".","_")+".json",mapped);
                console.log(medzicas()+" FINISH");

                if (method === 'issue') {
                    db.closeDB();
                }

                client.close();
            });
        });
    });
};


function setArg(){

    /*
     -s var comparison = 1;
     -u var usecase_file = "PlaceOrder.md";
     -c var code_file = "PlaceOrder_code01.php";
     -d var database = "twenty";
     */

    if (argv.s != undefined){
        comparison = argv.s;
    }

    if (argv.u != undefined){
        usecase_file = argv.u;
    }

    if (argv.c != undefined){
        code_file = argv.c;
    }

    if (argv.d != undefined){
        database = argv.d;
    }

    if (argv.m != undefined){
        method = argv.m;
    }
};

function writeToFile(filename, what){

    //fs.writeFile(filename, JSON.stringify(util.inspect(what,false,null),null,4), function(err) {
    fs.writeFile(filename, JSON.stringify(what,null,4), function(err) {
        if(err) {
            return console.log(err);
        }

        console.log(medzicas() + "The file was saved!");
    });
}


// simplifying sentence
function simplifyText(text){
    return text.replace(/[()]/g,"").replace(/->/g, " ").replace(/([a-z](?=[A-Z]))/g, "$1 ").toLowerCase();
};


// evaluate similarity for one issue
function evaluateIssue(rating_set){

    var code_rating = [0];
    var step_rating = [0];
    var direct_rating = [0];

    var result = 0;

    for (var i in rating_set){

        if (rating_set[i].type === 'code')
            code_rating.push(rating_set[i].sim);
        else if (rating_set[i].type === 'step')
            step_rating.push(rating_set[i].sim);
        else if (rating_set[i].type === 'direct')
            direct_rating.push(rating_set[i].sim);
    }

    if (method === "issue") {
        var result1 = findMax(code_rating);
        var result2 = findMax(step_rating);

        result = result1 + result2;
    } else if (method === "direct"){
        var result3 = findMax(direct_rating);

        result = result3;
    }

    return result;
};


// request similarity for two sentences
function getRPCsim(sentence1,sentence2){
    return new Promise(function(resolve){
        client.invoke("getsim", [sentence1,sentence2], function (error, res, more) {
            if (res != undefined) {
                console.log(medzicas()+" RPC SIM ("+ counter+")FOR '"+sentence1.substr(0,10)+"...' AND '"+sentence2.substr(0,10)+"...' IS "+ res);

                resolve(res);
            } else {
                console.log(error);
                resolve(0);
            }
        });
    });
};


// ------------------- Tasks to be pushed into sequence -------------------

var getRatingTask = function(type, sentence1, sentence2){
    return function() {
        return getRatingSentence(type, sentence1, sentence2).catch(function(error){
                console.log(error);
            }
        );
    }
};


var fragmentTask = function(fragment, usecase_step){
    return function() {
        return workWithFragment(fragment, usecase_step).catch(function(error){
                console.log(error);
            }
        );
    }
};


var getRatingMethodTask = function(class_name, method_block, usecase_step){
    return function() {
        console.log(medzicas()+" COMPARING '"+ method_block.name+"' '"+usecase_step.orig+"'");
        return getRatingMethod(class_name, method_block, usecase_step).catch(function(error){
                console.log(error);
            }
        );
    }
};


var getRatingForCodeSentenceTask = function(code_sentence, usecase_step){
    return function() {
        return getRatingForCodeSentence(code_sentence, usecase_step).catch(function(error){
                console.log(error);
            }
        );
    }
};

var getRatingPerIssueTask = function(issue, code_sentence, usecase_step){
    return function() {
        return getRatingPerIssue( issue, code_sentence, usecase_step).catch(function(error){
                console.log(error);
            }
        );
    }
};

// ------------------------    End of tasks    ------------------------


// get similarity rating by issue, code sentence and use case step
function getRatingPerIssue(issue, code_sentence, usecase_step){

    return new Promise(function (issue_resolve) {

        db.getSentencesById(issue.id).then(function (sentences) {
            var rating_task_array = [];

            for (var j in sentences) {

                if (sentences[j].issue_id === 0) {
                    rating_task_array.push(getRatingTask("code", sentences[j].sentence, code_sentence));
                }
                else {
                    rating_task_array.push(getRatingTask("step", sentences[j].sentence, usecase_step));
                }
            }

            var result_promise = sequence(rating_task_array, function (rating_set) {
                issue_resolve(evaluateIssue(rating_set));
            });
        });
    })
}


// get similarity rating of two sentences
function getRatingSentence(type, sentence1, sentence2){

    var result_obj = {type:type, sim:0};
    counter++;

    return new Promise(function(resolve){

        if (comparison === 'simple'){
            result_obj.sim = similarity(sentence1, sentence2);

            resolve(result_obj);

        } else if(comparison === 'advanced'){

            getRPCsim(sentence1,sentence2).then(function(sim_RPC){
                result_obj.sim = sim_RPC;

                resolve(result_obj);
            });
        }
    });
};

/**
 * @author Michal Bystricky
 * @param fns
 * @param done
 * @param ress
 */
function sequence(fns, done, ress) {

    if (!ress) ress = [];
    if (fns.length >= 1) {
        var promise = fns[0]();
        promise.then(function (res) {
            //console.log('I\'ve just finished '+fns.length+'. promise');
            ress.push(res);
            sequence(fns.slice(1), done, ress);
        });
    } else {
        done(ress);
    }
}


// get similarity rating for code sentence and use case step
function getRatingForCodeSentence(code_sentence, usecase_step){

    return new Promise(function(code_sentence_resolve){

        if (method === 'issue') {
            // lets compare sentences
            db.getIssues().then(function (issues) {

                var issue_ta = [];

                for (var i in issues) {

                    issue_ta.push(getRatingPerIssueTask(issues[i], code_sentence, usecase_step));
                }

                var result_promise = sequence(issue_ta, function (issues_result) {
                    //console.log(findMax(issues_result));
                    code_sentence_resolve(findMax(issues_result));
                });
            });
        }
        else if (method === 'direct'){

            getRatingSentence("direct", code_sentence, usecase_step).then(function(result){

                console.log("RESULT "+ code_sentence + " | " + usecase_step );
                console.log(result);
                code_sentence_resolve(result.sim);
            });

        }
        else{
            console.log("Unknown method");
        }
    });
}


// get similarity rating for method block ande use case step
function getRatingMethod(class_name, method_block, usecase_step){

    return new Promise(function(bigresolve){

        var code_sentence_ta = [];
        var code_sentence_set = [];
        var method_regex = /[a-zA-Z][a-zA-Z0-9_]*(->[a-zA-Z][a-zA-Z0-9_]*)+/g;

        // push 'class method' from definition
        code_sentence_set.push(simplifyText(class_name+" "+method_block.name));

        // lets find method calls
        var method_set = method_block.body.match(method_regex);

        for (var i in method_set){
            var code_sentence = simplifyText(method_set[i]);
            var first_word = code_sentence.match(/^([\w\-]+)/)[0];
            var everything_but_first_word = code_sentence.replace(/^[\w\-]+/,"");

            if (first_word === "this"){
                code_sentence = everything_but_first_word.trim();
            }
            code_sentence_set.push(code_sentence);
        }

        // finding the similarity for one sentence from code and use case step
        for (var h in code_sentence_set){

            code_sentence_ta.push(getRatingForCodeSentenceTask(code_sentence_set[h], usecase_step.parsed));
        }

        var result_promise = sequence(code_sentence_ta,function(result){

            //class name method name console.log(result[0]);

            var similarity_rating = (findMax(result));

            console.log(medzicas() + " Finished '"+ method_block.name.substr(0,15) + "...' and '"+usecase_step.orig.substr(0,15)+"...'");
            console.log(medzicas()+" "+similarity_rating+" "+result.length);
            console.log();

            bigresolve({file: code_file, class: class_name, method:method_block.name, usecase:usecase_step.orig, rating:similarity_rating});
        });

    });
};


// get similarity rating for code fragment and use case step
function workWithFragment(fragment, usecase_step_parsed){

    return new Promise(function(resolve){

        var method_rating_ta = [];
        var code_parsed = useion.block.parse(fragment,"php");

        for(var i in code_parsed.tree.children){
            var class_block = code_parsed.tree.children[i];

            if (class_block.type === 'class'){

                for (var j in class_block.children){
                    var method_block = class_block.children[j];


                    if (method_block.type === 'method') {

                        method_rating_ta.push(getRatingMethodTask(class_block.name, method_block, usecase_step_parsed));
                    }
                    else{
                        console.log("ZAKRUTA "+method_block.type);
                    }
                }
            }
            else{
                console.log("ZAKRUTA "+class_block.type);
            }
        }

        var result_promise = sequence(method_rating_ta,function(rating){

            resolve(rating);
        });
    });
};


// get simplified sentences from use case step
function getSentence (sentence) {

    // get rid of the use case number
    var string_without_number = sentence.match(/\s*\S+\s+(.*)/)[1];

    // filter out everything but nouns and verbs
    console.log(medzicas()+" RPC SENDING " + string_without_number);
    return new Promise(function (resolve) {
        client.invoke("gettag", string_without_number, function (error, res, more) {
            var result = "";
            console.log(medzicas()+" RPC RECIEVED " + res);
            if (res != undefined) {
                var sentence_tagged = JSON.parse(res.toString());

                result = func.filterTags(sentence_tagged);
                result = result.toLowerCase();
            }
            resolve({orig:sentence, parsed:result});
        });
    });
};


// find maximum value of an array
function findMax(array){
    var result = 0;
    for (var i in array)
        if (array[i] > result)
            result = array[i];
    return result;
};


// return time stamp
function medzicas() {
    var duration = Date.now() - start;
    var minutes = Math.floor(duration / 60000);
    var seconds = Math.floor((duration - (minutes * 60000)) / 1000);
    var therest = duration - (seconds * 1000) - (minutes * 60000);
    return util.format("[%dm %ds %dms]", minutes, seconds, therest);
};



// open file by name
function openFile(fileName){

    return new Promise(function(resolve, reject){
        fs.readFile(fileName,'utf-8',function (err,data){
            if (err){
                return console.log(err);
            }
            else{
                resolve(data);
            }
        });
    });
};


main();
