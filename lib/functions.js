var zerorpc = require("zerorpc");
var util = require('util');


var sentence_func =  {

    simplifySentence: function (sentence) {

        var result = sentence.replace(/[.,\-'`\r\n]/g, "");

        result = sentence_func.fixCamelCase(result);
        result = result.replace(/[_\/\[\]*()<>:@!]/g, " ");

        return result.trim();
    },


    extractFromTags : function (result) {
        var local_set = [];

        for (var i in result) {
            var sentence = result[i];
            if (sentence != "") {
                var filtered_sentence = sentence_func.filterTags(JSON.parse(sentence));
                if (filtered_sentence != "") {
                    local_set.push(filtered_sentence);
                }
            }
        }

        return local_set;
    },


    filterTags: function (sentence) {
        var result = "";

        for (var i in sentence) {
            switch (sentence[i][1]) {
                case 'NN':
                case 'NNP':
                case 'NNS':
                case 'NNPS':
                case 'VB':
                case 'VBD':
                case 'VBG':
                case 'VBN':
                case 'VBP':
                case 'VBZ':
                    if (result != "") {
                        result += " ";
                    }
                    result += sentence[i][0];
                    break;
                default:
                    break;
            }
        }
        return result;
    },


    fixCamelCase :function (sentence){

        return sentence.replace(/([a-z](?=[A-Z]))/g, "$1 ").toLowerCase();
    }
};

module.exports = sentence_func;