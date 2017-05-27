var request = require('request');
var Promise = require('promise');
var parseDiff = require('parse-diff');
var sqlite3 = require('sqlite3').verbose();
var beep = require('node-beep');
var util = require('util');
var fs = require('fs');
var zerorpc = require("zerorpc");
var useion = require("./../useion/lib/parser");
var utils = require("./../useion/lib/helpers/utils.js");
var func = require("./functions.js");
var github = require("./githubAPI.js");
var db = require("./database.js");
var issue = require("./issue.js");
var argv = require('minimist')(process.argv.slice(2));


var start = Date.now();
var client = new zerorpc.Client();

var usecase_file = "ChangePassword.md";


main();


//-----------------------------------------------------------------------------------------------------------

function main(){

    // setting options from arguments
    setArg();

    // parsing use case from the file
    var useCaseParser = new useion.Usecase();
    var parser_usecase = useCaseParser.parse(usecase_file);
    var usecase_name = parser_usecase.name;
    var repoSet = [];

    console.log("The name is: "+usecase_name);

    // set up RPC client
    client.connect("tcp://127.0.0.1:4242");

    repoSet.push({owner:"ReactiveX", repo:"RxJava"});
    repoSet.push({owner:"spring-projects", repo:"spring-boot"});
    //repoSet.push({owner:"opencart", repo:"opencart"});

    // process page = 1 & per_page = 20
    workWithIssue(repoSet, usecase_name).then(function(idw){

        // fill the database with results
        console.log("FINISH");
        console.log(idw);


        //open database
        db.openDB("./"+usecase_name.replace(" ","")+".db");
        db.initTables();
        db.fillDatabase(idw);

        console.log(medzicas()+" SAVED TO DATABASE");

        db.closeDB();
        client.close();
    });
}

function setArg(){

    /*
     -u var usecase_file = "PlaceOrder.md";
     */

    if (argv.u != undefined){
        usecase_file = argv.u;
    }
}


// print number of issues with commit
function print_with_commit(base_body){
    var msg = "Issue co maju commit: ";
    for(var i in base_body) {
        if (base_body[i].pull_request != undefined) {
            msg += " " + i;
        }
    }
    console.log(msg);
}

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


// get issue message for every id in id_set
function getMsg(issue_set){

    // request to get tags for words in sentence
    function getTags (client, sentence) {

        console.log(medzicas()+" RPC SENDING " + sentence);
        return new Promise(function (resolve, reject) {
            client.invoke("gettag", sentence, function (error, res, more) {
                var result = "";
                console.log(medzicas()+" RPC RECIEVED " + res);
                if (res != undefined) {
                    result = res.toString();
                }
                resolve(result);
            });
        });
    }

    // get issue message by id
    function getMsgSmall(issue){
        return new Promise(function(resolve, reject){
            var promise_set = [];

            var string_set = issue.issue.body.match(/[^.,;]+[.,;]*/g);

            for (var k in string_set){
                var string = func.simplifySentence(string_set[k]);
                promise_set.push(getTags(client,string));
            }

            Promise.all(promise_set).then(function(results){
                issue.msg = results;
                resolve(issue);
            });
        });
    }

    console.log(medzicas() + " Getting msg for " + issue_set.length + " issues");

    return new Promise(function(resolve){
        var promise_set = [];

        for (var i in issue_set) {
            promise_set.push(getMsgSmall(issue_set[i]));
        }

        Promise.all(promise_set).then(function(result_set){
            resolve(result_set);
        });
    });
}

function setIds(issue_set){

    function setIdForIssue(issue){
        return new Promise(function(resolve){
            github.getProjectId(issue.info.owner,issue.info.repo).then(function(project_id){
                issue.info.id = project_id;
                resolve(issue);
            });
        })
    }

    return new Promise(function(resolve){
        var promise_set = [];

        for (var i in issue_set){
            promise_set.push(setIdForIssue(issue_set[i]));
        }

        Promise.all(promise_set).then(function(result){
            resolve(result);
        });
    });
}


// download issues from github repository
function workWithIssue(repoSet, usecase_name){

    var getDiffTask = function(one_issue){
        return function(){
            return getDiff(one_issue).catch(function(error){})}};


    return new Promise(function(bigresolve){

        issue.doIt(repoSet, usecase_name).then(function (issue_set) {

            var getDiff_ta = [];    // task array

            console.log("FOUND "+ issue_set.length + " ISSUES" );

            for (var i in issue_set){
                console.log(issue_set[i].info.owner+" "+issue_set[i].info.repo+" "+issue_set[i].sim);
                getDiff_ta.push(getDiffTask(issue_set[i]));
            }

            console.log("Pocet issue: " + issue_set.length);
            console.log("Pocet task: " + getDiff_ta.length);

            sequence(getDiff_ta, function (results) {

                var id_set = [];

                // find which issues had sentence extracted from them
                for(var i in results){
                    id_set.push(results[i].issue.id);
                }


                console.log(medzicas()+" Got code ready");
                console.log(id_set);

                // get issue messages
                getMsg(results).then(function (results2) {

                    console.log(medzicas()+" Got messages");

                    for (var i in results2) {
                        var good_sentence = func.extractFromTags(results2[i].msg);
                        if (good_sentence != undefined){
                            results2[i].msg = good_sentence;
                        }
                        else{
                            console.log("not good");
                        }
                    }

                    setIds(results2).then(function(issues_with_ids){
                        bigresolve(issues_with_ids);
                    });
                });
            });
        });
    });
}


// print timestamp
function medzicas() {
    var duration = Date.now() - start;
    var minutes = Math.floor(duration / 60000);
    var seconds = Math.floor((duration - (minutes * 60000)) / 1000);
    var therest = duration - (seconds * 1000) - (minutes * 60000);
    return util.format("[%dm %ds %dms]", minutes, seconds, therest);
}



function getFileDir(from, to){
    if (from === to)
        return from;
    else{
        if (from === '/dev/null')
            return to;
        else
            return from;
    }
}


// find class name for method
function find_method(method, node){
    var result = "";
    var class_name = "";

    if (node.type === "class"){
        class_name = node.start_statement;
        class_name = class_name.match(/class\s+([a-zA-Z_-]+)/)[1];
    }

    for (var i in node.children){
        var child = node.children[i];
        if (child.type === 'class'){
            result = find_method(method, child);
            if (result != ""){
                return result;
            }
        }
        else if(child.type === 'method'){
            var method_from_code = child.name.replace(/\(.*\)/,"");
            if (method_from_code === method){
                if (class_name != ""){
                    result = class_name + " " + method;
                }
                return result;
            }
        }
    }
    return result;
}


// find class name for method names in set
function getClassFromFile(url, set){

    var method_set_local = [];

    return new Promise(function(resolve,reject){

        github.requestAPI(url).then(function(java_file_raw){

            if (java_file_raw != undefined ){
                    var parsed_file = useion.block.parse(java_file_raw, 'java');

                    for (var i in set) {
                        var result = find_method(set[i], parsed_file.tree);
                        if (result != "") {
                            method_set_local.push(result);
                        }
                    }

                    resolve(method_set_local);
            }
            else{
                console.log("Cannot get it");
                resolve(method_set_local);
            }
        });
    });
}




// get diff file for issue in order to find sentences from code
function getDiff(issue){

    console.log(medzicas()+" Getting diff file for "+ issue.issue.title);

    return new Promise(function(resolve){

        console.log(medzicas()+" DIFF URL: "+issue.issue.pull_request.diff_url);

        github.requestAPI(issue.issue.pull_request.diff_url).then(function(file_raw){
            github.requestAPI(issue.issue.pull_request.url).then(function(url){

                var head_sha = JSON.parse(url).head.sha;

                if (file_raw != undefined) {
                    var diff_file = parseDiff(file_raw);
                    var promise_set = [];
                    var method_call_issue = [];

                    console.log(medzicas()+" Recieved diff file ("+diff_file.length+")");

                    for (var i in diff_file) {

                        var method_set_file = [];
                        var diff = diff_file[i];
                        var diff_dir = getFileDir(diff.from, diff.to);

                        //console.log(medzicas()+ "Working on "+i+"/"+diff_file.length);

                        if (diff_dir.match(/\.java$/)) {
//                            var diff_url = "https://api.github.com/repos/" + issue.info.owner + "/" + issue.info.repo + "/contents/" + diff_dir;
//                            var diff_url = "https://github.com/"+issue.info.owner + "/"+issue.info.repo+"/raw/"+head_sha+"/"+diff_dir;
                            var diff_url = "https://raw.githubusercontent.com/"+issue.info.owner + "/"+issue.info.repo+"/"+head_sha+"/"+diff_dir;

                            for (var j in diff.chunks) {
                                var chunk = diff.chunks[j];
                                var chunk_name = chunk.content.match(/ [\S]+[ ]*\(/);

                                // get method names
                                if (chunk_name != null) {
                                    var method_name = chunk_name[0].replace(/\($/, '').trim();

                                    if (method_set_file.indexOf(method_name) < 0) {
                                        method_set_file.push(method_name);
                                    }
                                }

                                // get method calls
                                for (var k in chunk.changes) {
                                    var change = chunk.changes[k];
                                    if (change.type === 'add' && change.content.indexOf('.') > 0) {
                                        var strung = change.content;
                                        var strung2 = strung.match(/\s*([a-zA-Z]+)\.([a-zA-Z]+)\s*\(/);

                                        if (strung2 != null) {
                                            var potential_result = func.fixCamelCase(strung2[1] + " " + strung2[2]);

                                            if (method_call_issue.indexOf(potential_result) < 0) {
                                                method_call_issue.push(potential_result);
                                            }
                                        }
                                    }
                                }
                            }
                            if (method_set_file.length > 0) {

                                promise_set.push(getClassFromFile(diff_url, method_set_file));

                            }
                        }
                    }

                    Promise.all(promise_set).then(function (result) {

                        var result_set = [];

                        for (var i in result) {
                            if (result[i].length > 0) {
                                for (var j in result[i]) {
                                    result_set.push(func.fixCamelCase(result[i][j]));
                                }
                            }
                        }
                        console.log(medzicas() + " Result " + issue.info.owner + " " + issue.info.repo + " " + method_call_issue.length + " " + result_set.length);

                        resolve({info:issue.info, issue:issue.issue, call:method_call_issue, def:result_set});
                    });
                }
                else{
                    console.log("Cannot get it");
                    resolve({info:issue.info, issue:issue.issue, call:[],def:[]});
                }

            });
        });
    });
}


