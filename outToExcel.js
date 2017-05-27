/* SETTINGS */
var compare = [
    'Output.json'
];

var similarityAbove = 0;

/* END SETTINGS */


var fs = require('fs'),
    argv = require('minimist')(process.argv.slice(2)),
    excel = require('excel4node'),
    parser = require('./useion/lib/parser/index.js');

var json = [],
    stats = [];

for (var i in compare) {
    json.push(JSON.parse(fs.readFileSync(compare[i], "utf-8")));
}

var workbook = new excel.Workbook();
var worksheet = workbook.addWorksheet('Sheet 1');

worksheet.cell(1,1).string('UC');
worksheet.cell(1,2).string('Step no.');
worksheet.cell(1,3).string('Step name');
worksheet.cell(1,4).string('class');
worksheet.cell(1,5).string('method');

var j = 6;
for (var i in compare) {
    worksheet.cell(1,j).string(compare[i]);
    j++;
}


function findMethods (j, ucName, stepName) {
    for (var i in j) {
        if (ucName == j[i].name) {
            for (var k in j[i].steps) {
                if (j[i].steps[k].step == stepName) {
                    return j[i].steps[k].methods
                }
            }
        }
    }
    return null;

}

function gen () {
    var line = 2;
    for (var i in json[0]) {
        var uc = json[0][i],
            ucName = uc.name,
            ucPath = uc.path,
            useCaseParser = new parser.Usecase(),
            parser_usecase = useCaseParser.parse(ucPath),
            corr = {},
            incorr = {};


        var stats_counter = {};

        for (var k in compare) {

            if (!(k in stats_counter))
                stats_counter[k] = {
                    correct: 0,
                    incorrect: 0
                }


            corr[k] = {};
            incorr[k] = {};
        }



        var methodsUc = {};
        for (var j in parser_usecase.fragments) {
            var fragment = parser_usecase.fragments[j];
            if (fragment.lang == "php") {
                var body = fragment.body;
                var f = parser.block.parse(body, 'php').tree;


                for (var c in f.children) {

                    var cls = f.children[c]

                    if (cls.type == "class") {
                        for (var m in cls.children) {
                            var mth = cls.children[m];

                            if (mth.type == "method") {

                                if (!(cls.name+'-'+mth.name in methodsUc))
                                    methodsUc[cls.name+'-'+mth.name] = mth;
                            }
                        }
                    }
                }



            }
        }


        for (var j in uc.steps) {
            var step = uc.steps[j],
                stepNo = step.stepNumber,
                stepName = step.step;


            var methodsMerged = {};

            var steps_methods = [];

            for (var k in json) {
                steps_methods.push(findMethods(json[k], ucName, stepName))
            }

            for (var l in steps_methods) {
                for (var k in steps_methods[l]) {
                    var method = steps_methods[l][k];
                    if (!(method.className in methodsMerged))
                        methodsMerged[method.className] = {}
                    if (!(method.methodName in methodsMerged[method.className]))
                        methodsMerged[method.className][method.methodName] = {}
                    methodsMerged[method.className][method.methodName][l] = method.similarity;
                }
            }

            for (var className in methodsMerged) {
                for (var methodName in methodsMerged[className]) {
                    worksheet.cell(line,1).string(ucName);
                    worksheet.cell(line,2).string(stepNo);
                    worksheet.cell(line,3).string(stepName);
                    worksheet.cell(line,4).string(className);
                    worksheet.cell(line,5).string(methodName);


                    for (var k in compare) {

                        if (methodsMerged[className][methodName][k] < similarityAbove)
                            continue;


                        if (k in methodsMerged[className][methodName]) {
                            if (className+'-'+methodName in methodsUc) {
                                var s = workbook.createStyle({
                                    font: { color: '00ff00'}
                                });
                                if (!(className+'-'+methodName in corr[k])) {
                                    corr[k][className+'-'+methodName] = 'a'
                                    stats_counter[k]['correct']++;
                                }

                            } else {
                                var s = workbook.createStyle({
                                    font: { color: 'ff0000'}
                                });
                                if (!(className+'-'+methodName in incorr[k])) {
                                    incorr[k][className+'-'+methodName] = 'a'
                                    stats_counter[k]['incorrect']++;
                                }

                            }

                            worksheet.cell(line,6+parseInt(k)).number(methodsMerged[className][methodName][k]).style(s);
                        }
                    }

                    line++;
                }

            }

        }

        stats.push({
            uc: ucName,
            implMethods: Object.keys(methodsUc).length,
            stats_counter: stats_counter
        })


    }
}

function genStats () {
    var worksheet = workbook.addWorksheet('Sheet 2');


    for (var i in compare) {
        worksheet.cell(1,3+(parseInt(i)*3)).string(compare[i]);
    }

    worksheet.cell(2,1).string('UC');
    worksheet.cell(2,2).string('methods implementing UC');

    for (var i in compare) {
        worksheet.cell(2,3+(parseInt(i)*3)).string('correct');
        worksheet.cell(2,4+(parseInt(i)*3)).string('% correct');
        worksheet.cell(2,5+(parseInt(i)*3)).string('incorrect');
    }

    var line = 3;

    for (var i in stats) {

        if (stats[i]['implMethods'] === 0) {
            console.log('No methods? ', stats[i]['uc'])
            continue;
        }

        worksheet.cell(line,1).string(stats[i]['uc']);
        worksheet.cell(line,2).number(stats[i]['implMethods']);

        var stats_counter = stats[i]['stats_counter'];

        for (var j in stats_counter) {
            var s = stats_counter[j];
            worksheet.cell(line,3+(parseInt(j)*3)).number(s['correct']);
            worksheet.cell(line,4+(parseInt(j)*3)).number((s['correct']/stats[i]['implMethods'])*100);
            worksheet.cell(line,5+(parseInt(j)*3)).number(s['incorrect']);

        }

        line++;
    }



}

gen();
genStats();

workbook.write('Output.xlsx');



