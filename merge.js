
var     fs = require("fs"),
    jsfile = require('jsonfile');


var merge = [
    //'Output-direct-advanced.json',
    'Output-direct-simple.json',
    //'Output-issue-advanced.json',
    'Output-issue-simple.json',
/*    'Output-orig.json',*/
    //'Output-orig-synon.json',
    //'Output-orig-synon-hyper.json',
    /*'Output-orig-synon-hyper-hypo.json',*/
 /*   'Output-small-orig.json',*/
    //'Output-small-orig-synon.json',
    //'Output-small-orig-synon-hyper.json',
    /*'Output-small-orig-synon-hyper-hypo.json',*/
    //'Output-advanced.json'
];

var json = [],
    stats = [];

for (var i in merge) {
    json.push(JSON.parse(fs.readFileSync(merge[i], "utf-8")));
}

function inAll (uct, metht) {

    for (var l in json) {
        if (l==0) continue;
        var inThis = false;
        for (var i in json[l]) {
            var uc = json[l][i];


            for (var j in uc.steps) {
                var step = uc.steps[j];

                for (var k in step.methods) {
                    var method = step.methods[k];

                    if (uc.name == uct.name && //step.step == stept.step &&
                        method.className == metht.className &&
                        method.methodName == metht.methodName) {
                        inThis = true;
                        break;
                    }
                }
                if (inThis) break;
            }
            if (inThis) break;
        }
        if (!inThis) {
            console.log(metht.className, metht.methodName, "not in", merge[l], uc.name)
            return false;
        }
    }

    return true;

}

var fjson = json[0],
    res = [];

var ruc = {}, alrdy = {};
for (var i in fjson) {
    var uc = fjson[i];

    for (var j in uc.steps) {
        var step = uc.steps[j];

        for (var k in step.methods) {
            var method = step.methods[k];

            if (inAll(uc, method)) {

                if (!(uc.name in ruc)) {
                    ruc[uc.name] = {
                        path: uc.path,
                        name: uc.name,
                        steps: {}
                    }
                    alrdy[uc.name] = {};
                }

                var key = method.className+'-'+method.methodName;
                if (!(key in alrdy[uc.name])) {
                    alrdy[uc.name][key] = method;


                    if (!(step.step in ruc[uc.name].steps))
                        ruc[uc.name].steps[step.step] = {
                            stepNumber: step.stepNumber,
                            step: step.step,
                            methods: {}
                        }

                    if (!(key in ruc[uc.name].steps[step.step].methods))
                        ruc[uc.name].steps[step.step].methods[key] = method;

                }
            }
        }
    }


}


console.log('saving to Output.json');
var jfile = "Output.json";
jsfile.writeFileSync(jfile, ruc, {spaces: 2});


