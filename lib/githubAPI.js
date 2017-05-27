var request = require('request');
var Promise = require('promise');
var fs = require('fs');
var aguid = require('aguid');

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

            var f = "cache/"+aguid("getIssue-"+owner+repo+page+per_page);
            if (!fs.existsSync(f)) {

                githubAPI.requestAPI(full_url).then(function(body) {
                    fs.writeFileSync(f, body);
                    if (body != undefined) {
                        var base_body = JSON.parse(body);
                        resolve(base_body);
                    }
                    else{
                        resolve();
                    }
                });
            } else {

                var body = fs.readFileSync(f, "utf8");
                var base_body = JSON.parse(body);
                resolve(base_body);

            }

        });
    },

    getIssueLabeled : function (info, page, per_page) {
        var full_url = "https://api.github.com/repos/" + info.owner + "/" + info.repo + "/issues?&state=closed&page=" + page + "&per_page=" + per_page;

        return new Promise(function (resolve) {

            var f = "cache/"+aguid("getIssueLabeled-"+info+page+per_page);
            if (!fs.existsSync(f)) {



                githubAPI.requestAPI(full_url).then(function(body) {
                    if (body != undefined) {
                        fs.writeFileSync(f, body);

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

            } else {

                var body = fs.readFileSync(f, "utf8");
                var base_body = JSON.parse(body);
                var result_set = [];

                for(var i in base_body){
                    result_set.push({info:info, issue:base_body[i]});
                }
                resolve(result_set);

            }
        });
    },


    requestAPI : function (url){
        console.log("Requesting "+url);
        return new Promise(function(resolve){


            var f = "cache/"+aguid("requestAPI-"+url);
            if (!fs.existsSync(f)) {




                request(set_opt(url), function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        fs.writeFileSync(f, body);

                        resolve(body);
                    }
                    else{
                        console.log("Status code "+response.statusCode+" "+url);
                        resolve();
                    }
                });


            } else {

                var body = fs.readFileSync(f, "utf8");
                resolve(body);

            }
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
            'authorization': 'token ad9de045e5d16be3aea60b21eb8e42d3b3bfa511'
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
