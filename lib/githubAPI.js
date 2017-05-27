var request = require('request');
var Promise = require('promise');

var githubAPI = {

    getIssuesPageCount : function  (owner, repo, per_page) {
        return new Promise(function (resolve, reject) {
            var url = "https://api.github.com/repos/" + owner + "/" + repo + "/issues?state=closed&per_page=" + per_page;
            request(set_opt(url), function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var pageCount = response.headers.link.substring(0, response.headers.link.length - 13).match(/[0-9]+$/)[0];
                    resolve(pageCount);
                } else {
                    console.log("Error ", error);
                    reject(error);
                }
            });
        });
    },


    getProjectId : function  (owner, repo) {
        return new Promise(function (resolve, reject) {
            var url = "https://api.github.com/repos/" + owner + "/" + repo + "";
            request(set_opt(url), function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var projectId = JSON.parse(body).id;
                    resolve(projectId);
                } else {
                    console.log("Error ", error);
                    reject(error);
                }
            });
        });
    },


    getIssue : function (owner, repo, page, per_page) {
        var full_url = "https://api.github.com/repos/" + owner + "/" + repo + "/issues?&state=closed&page=" + page + "&per_page=" + per_page;

        return new Promise(function (resolve) {
            githubAPI.requestAPI(full_url).then(function(body) {
                if (body != undefined) {
                    var base_body = JSON.parse(body);
                    resolve(base_body);
                }
                else{
                    resolve();
                }
            });
        });
    },

    getIssueLabeled : function (info, page, per_page) {
        var full_url = "https://api.github.com/repos/" + info.owner + "/" + info.repo + "/issues?&state=closed&page=" + page + "&per_page=" + per_page;

        return new Promise(function (resolve) {
            githubAPI.requestAPI(full_url).then(function(body) {
                if (body != undefined) {
                    var base_body = JSON.parse(body);
                    var result_set = [];

                    for(var i in base_body){
                        result_set.push({info:info, issue:base_body[i]});
                    }
                    resolve(result_set);
                }
                else{
                    resolve();
                }
            });
        });
    },


    requestAPI : function (url){
        console.log("Requesting "+url);
        return new Promise(function(resolve){
            request(set_opt(url), function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    resolve(body);
                }
                else{
                    console.log("Status code "+response.statusCode+" "+url);
                    resolve();
                }
            });
        });
    }
}

module.exports = githubAPI;

function set_opt(url){
    var options = {
        url: url,
        headers: {
            'User-Agent': 'curalyon',
            'username': 'curalyon',
            'authorization': 'token 5637b2e6d139a7499397a1671049297be99dcfd1'
        }
    };
    return options;
}

/*
var bruh_url = "https://raw.githubusercontent.com/ReactiveX/RxJava/3fe0d2b497583442692f4168144c66f5690e5f24/src/main/java/io/reactivex/Completable.java";

githubAPI.requestAPI(bruh_url).then(function(eyo){
    console.log(eyo);
});
    */