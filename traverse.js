/**
 * Description: Interface to run compare.js over the whole directories
 *
 * Example use: node traverse.js --uc-path example/spec --code-path example/implementation/
 *
 * Author: Michal Bystricky
 */

var argv = require('minimist')(process.argv.slice(2)),
    path = require("path"),
    ucPath = path.resolve(argv['uc-path']),
    codePath = path.resolve(argv['code-path']),
    Promise = require('promise'),
    sequential = require('promise-sequential'),
    fstools = require('./useion/lib/helpers/fstools.js'),
    fs = require("fs"),
    utils = require("./useion/lib/helpers/utils.js"),
    jsfile = require('jsonfile');

var exec = require('child_process').exec;
var parser = require("./useion/lib/parser");

var method = argv['method'], //"direct",
    comparison = argv['similarity'];

fstools.walk(ucPath, function (err, ucFiles) {

    fstools.walk(codePath, function (err,codeFiles) {

        var seq = [],
            res = {},
            inSeq = function (uc, code) { return function () {
                return new Promise(function (f, r) {
                    var cmd = "node lib/compare.js -m "+method+" -s "+comparison+" -u "+uc+" -c "+code+" -l "+argv['lang']+" -o "+argv['issue-owner']+" -r "+argv['issue-repo'];
                    console.log("executing "+cmd);

                    exec(cmd, function(error, stdout, stderr) {
                        var useCaseParser = new parser.Usecase();
                        var parser_usecase = useCaseParser.parse(uc);
                        var usecase_name = parser_usecase.name;

                        var shouldGenerate = usecase_name.replace(" ","")+"_"+method+"_"+comparison+"_"+code.replace(/\//g,"_").replace(".","_")+".json";

                        var r = JSON.parse(fs.readFileSync(shouldGenerate, "utf-8"));

                        if (!(usecase_name in res))
                            res[usecase_name] = {name: usecase_name, path: path.resolve(uc), steps: {}};

                        for (var i in r['steps']) {

                            if (!(r['steps'][i].stepNumber in res[usecase_name]['steps']))
                                res[usecase_name]['steps'][r['steps'][i].stepNumber] = {
                                    stepNumber: r['steps'][i].stepNumber,
                                    step: r['steps'][i].step,
                                    methods: []
                                };

                            for (var j in r['steps'][i]['methods']) {
                                r['steps'][i]['methods'][j]['path'] = path.resolve(code);
                                res[usecase_name]['steps'][r['steps'][i].stepNumber]['methods'].push(r['steps'][i]['methods'][j]);
                            }
                        }


                        f();


                    });


                });
            } };

        for (var i in ucFiles) {
            var ucFile = ucFiles[i];
            for (var j in codeFiles) {
                var codeFile = codeFiles[j];

                seq.push(inSeq(ucFile, codeFile))

            }

        }

        sequential(seq).then(function () {

            console.log('applying the biggest difference algorithm')


            function biggestDiff (arr, key) {

                function keysrt(key, rev) {
                    return function(a,b){
                        if (!rev) {
                            if (a[key] > b[key]) return 1;
                            if (a[key] < b[key]) return -1;
                        } else {
                            if (a[key] < b[key]) return 1;
                            if (a[key] > b[key]) return -1;
                        }
                        return 0;
                    }
                }

                var sorted = arr.sort(keysrt(key), false),
                    biggestDiff = -1,
                    biggestDiffI = null;
                for (var i in sorted) {
                    var item = sorted[i];
                    var nextI = parseInt(i)+1,
                        nextItem = null;
                    if (""+nextI in sorted) nextItem = sorted[nextI];

                    if (nextItem) {
                        var diff = nextItem[key] - item[key];
                        if (diff > biggestDiff) {
                            biggestDiff = diff;
                            biggestDiffI = parseInt(i);
                        }
                    }

                }
                if (biggestDiffI === null) return sorted;
                var newArr = [];
                for (var i in sorted) {
                    if (parseInt(i)>biggestDiffI) {
                        newArr.push(sorted[i]);
                    }
                }
                var sortedNewArr = newArr.sort(keysrt(key, true))
                return sortedNewArr;

            }



            for (var i in res) {
                var uc = res[i];
                for (var j in res[i].steps) {
                    var step = res[i].steps[j];

                    res[i].steps[j].methods = biggestDiff(res[i].steps[j].methods, 'similarity')
                }
            }


            console.log('saving to Output.json');
            var jfile = "Output.json";
            jsfile.writeFileSync(jfile, res, {spaces: 2});
            console.log(utils.dumpObject(res))
        })
    })



})




