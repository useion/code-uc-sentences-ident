/**
 * Created by Peter on 13.05.2017.
 */
var Promise = require('promise');
var request = require('request');
var github = require("./githubAPI.js");
//var beep = require('node-beep');
var zerorpc = require("zerorpc");
var similarity = require("similarity");
var sortBy = require('sort-by');
var util = require('util');
var useion = require("./../useion/lib/parser");
var utils = require("./../useion/lib/helpers/utils.js");
var func = require("./functions.js");
var db = require("./database.js");


//var client = new zerorpc.Client();

var start = Date.now();


//main();


//-----------------------------------------------------------------------------------------------------------

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



// simplifying sentence
function simplifyText(text){
    return text.replace(/[().]/g,"").replace(/->/g, " ").replace(/([a-z](?=[A-Z]))/g, "$1 ").toLowerCase();
}


function getIssuesByRepoSet(repoSet){

    var issue_ta = [];

    var getIssueTask = function(info, page, per_page){
        return function(){
            console.log(medzicas() + " Getting "+info.owner+"/"+info.repo+" page n. "+page);
            return github.getIssueLabeled(info, page, per_page).catch(function(error){
                    console.log(error);
    })}};

    var getIssuesPageCount = function(info, per_page){
        return function(){

            return github.getIssuesPageCount(info.owner,info.repo, per_page).then(function(page_number){

                console.log(medzicas() + " PAGE NUMBER FOR "+info.owner+"/"+info.repo+": "+page_number);
                for(var j = 1; j <=page_number; j++) {

                    issue_ta.push(getIssueTask(info,j,per_page));
                }
            });
        }
    };

    return new Promise(function(resolveMOM){
        var repo_ta = [];

        for (var i in repoSet){
            var per_page = 100;

            repo_ta.push(getIssuesPageCount(repoSet[i],per_page));

        }
        sequence(repo_ta, function(nothing_rly){

            sequence(issue_ta, function (project_set) {

                var result_set = [];


                for (var i in project_set){
                    for(var j in project_set[i]){

                        result_set.push(project_set[i][j]);
                    }
                }


                resolveMOM(result_set);
            });
        });
    });
}

function doIt(repoSet,usecase_name){

    return new Promise(function (resolve) {
        getIssuesByRepoSet(repoSet).then(function (project_set) {

            var potential_issues = [];
            // filter issues

            for (var j in project_set) {
                var issueb = project_set[j].issue;

                if (issueb.pull_request !== undefined && issueb.body !== null && issueb.body.length > 10) {

                    console.log(medzicas()+" Saving: '" + issueb.title + "' (" + issueb.body.length + ")");

                    potential_issues.push(project_set[j]);
                }
            }

            console.log(medzicas()+" I'VE GOT " + potential_issues.length + " ISSUES");
            console.log();

            for (var i in potential_issues) {
                var issue = potential_issues[i].issue;

                potential_issues[i].sim = similarity(simplifyText(issue.title), simplifyText(usecase_name));

            }
            console.log(medzicas()+" SORTING");
            potential_issues.sort(sortBy("-sim"));
            resolve(potential_issues.slice(0, 5));
        });
    });
}


module.exports = {
    doIt : doIt
};

// return time stamp
function medzicas() {
    var duration = Date.now() - start;
    var minutes = Math.floor(duration / 60000);
    var seconds = Math.floor((duration - (minutes * 60000)) / 1000);
    var therest = duration - (seconds * 1000) - (minutes * 60000);
    return util.format("[%dm %ds %dms]", minutes, seconds, therest);
};


function main(){
    var repoSet = [];

    repoSet.push({owner:"ReactiveX", repo:"RxJava"});
    //repoSet.push({owner:"spring-projects", repo:"spring-boot"});


    doIt(repoSet, "sample sentence spring is coming").then(function(result){
        console.log("RESULT:");
        console.log(result.length);

        for (var i in result){
            console.log(result[i].info);
            console.log(" "+result[i].sim);
        }
    });
}

//ISSUE EXAMPLE
/*

 { url: 'https://api.github.com/repos/spring-projects/spring-boot/issues/9091',
 repository_url: 'https://api.github.com/repos/spring-projects/spring-boot',
 labels_url: 'https://api.github.com/repos/spring-projects/spring-boot/issues/9091/labels{/name}',
 comments_url: 'https://api.github.com/repos/spring-projects/spring-boot/issues/9091/comments',
 events_url: 'https://api.github.com/repos/spring-projects/spring-boot/issues/9091/events',
 html_url: 'https://github.com/spring-projects/spring-boot/pull/9091',
 id: 226220616,
 number: 9091,
 title: 'Split reactive Redis autoconfig in pooled and single-connection configurations',
 user:
 { login: 'mp911de',
 id: 1035015,
 avatar_url: 'https://avatars0.githubusercontent.com/u/1035015?v=3',
 gravatar_id: '',
 url: 'https://api.github.com/users/mp911de',
 html_url: 'https://github.com/mp911de',
 followers_url: 'https://api.github.com/users/mp911de/followers',
 following_url: 'https://api.github.com/users/mp911de/following{/other_user}',
 gists_url: 'https://api.github.com/users/mp911de/gists{/gist_id}',
 starred_url: 'https://api.github.com/users/mp911de/starred{/owner}{/repo}',
 subscriptions_url: 'https://api.github.com/users/mp911de/subscriptions',
 organizations_url: 'https://api.github.com/users/mp911de/orgs',
 repos_url: 'https://api.github.com/users/mp911de/repos',
 events_url: 'https://api.github.com/users/mp911de/events{/privacy}',
 received_events_url: 'https://api.github.com/users/mp911de/received_events',
 type: 'User',
 site_admin: false },
 labels:
 [ { id: 16916896,
 url: 'https://api.github.com/repos/spring-projects/spring-boot/labels/status:%20declined',
 name: 'status: declined',
 color: 'fef2c0',
 default: false } ],
 state: 'closed',
 locked: false,
 assignee:
 { login: 'snicoll',
 id: 490484,
 avatar_url: 'https://avatars3.githubusercontent.com/u/490484?v=3',
 gravatar_id: '',
 url: 'https://api.github.com/users/snicoll',
 html_url: 'https://github.com/snicoll',
 followers_url: 'https://api.github.com/users/snicoll/followers',
 following_url: 'https://api.github.com/users/snicoll/following{/other_user}',
 gists_url: 'https://api.github.com/users/snicoll/gists{/gist_id}',
 starred_url: 'https://api.github.com/users/snicoll/starred{/owner}{/repo}',
 subscriptions_url: 'https://api.github.com/users/snicoll/subscriptions',
 organizations_url: 'https://api.github.com/users/snicoll/orgs',
 repos_url: 'https://api.github.com/users/snicoll/repos',
 events_url: 'https://api.github.com/users/snicoll/events{/privacy}',
 received_events_url: 'https://api.github.com/users/snicoll/received_events',
 type: 'User',
 site_admin: false },
 assignees:
 [ { login: 'snicoll',
 id: 490484,
 avatar_url: 'https://avatars3.githubusercontent.com/u/490484?v=3',
 gravatar_id: '',
 url: 'https://api.github.com/users/snicoll',
 html_url: 'https://github.com/snicoll',
 followers_url: 'https://api.github.com/users/snicoll/followers',
 following_url: 'https://api.github.com/users/snicoll/following{/other_user}',
 gists_url: 'https://api.github.com/users/snicoll/gists{/gist_id}',
 starred_url: 'https://api.github.com/users/snicoll/starred{/owner}{/repo}',
 subscriptions_url: 'https://api.github.com/users/snicoll/subscriptions',
 organizations_url: 'https://api.github.com/users/snicoll/orgs',
 repos_url: 'https://api.github.com/users/snicoll/repos',
 events_url: 'https://api.github.com/users/snicoll/events{/privacy}',
 received_events_url: 'https://api.github.com/users/snicoll/received_events',
 type: 'User',
 site_admin: false } ],
 milestone: null,
 comments: 1,
 created_at: '2017-05-04T09:16:53Z',
 updated_at: '2017-05-04T12:00:35Z',
 closed_at: '2017-05-04T12:00:26Z',
 pull_request:
 { url: 'https://api.github.com/repos/spring-projects/spring-boot/pulls/9091',
 html_url: 'https://github.com/spring-projects/spring-boot/pull/9091',
 diff_url: 'https://github.com/spring-projects/spring-boot/pull/9091.diff',
 patch_url: 'https://github.com/spring-projects/spring-boot/pull/9091.patch' },
 body: '`LettuceConnectionConfiguration` no longer requires `commons-pool2` unless pooling with Lettuce is configured.' }

 */
