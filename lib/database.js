var sqlite3 = require('sqlite3').verbose();
var db;


function main(){

    db = new sqlite3.Database('twenty');
    createProjectTable();
    createIssueTable();
    createSentenceTable();
    db.close();

};

module.exports = {

    openDB : function(name){
        console.log("Opening database with name: "+name);
        db = new sqlite3.Database(name)
    },

    closeDB : function(){
        db.close();
    },

    initTables : function(){
        createProjectTable();
        createIssueTable();
        createSentenceTable();
    },

    fillProjectTable : function (id, owner, repo) {
        db.run("INSERT OR IGNORE INTO project (id, owner, repo) VALUES (?,?,?)", id, owner, repo);
    },

    fillIssueTable : function (id, project_id) {
        db.run("INSERT OR IGNORE INTO issue (id, project_id) VALUES (?,?)", id, project_id);
    },

    fillSentenceTable : function (issue_id, commit_id, sentence) {
        db.run("INSERT OR IGNORE INTO sentence (issue_id, commit_id, sentence) VALUES (?,?,?)",
            issue_id, commit_id, sentence);
    },


    getSentencesById : function (id){
        return new Promise(function(resolve){
            db.all("SELECT * FROM `sentence` WHERE `issue_id` = '"+id+"' OR `commit_id` = '"+id+"'", function (err, rows) {
                resolve(rows);
            });
        });
    },


    getIssues : function (){

        return new Promise(function(resolve){
            db.all("SELECT * FROM issue", function (err, rows) {
                resolve(rows);
            });
        });
    },

    fillDatabase : function(idw){

        console.log("DATABASE");

        for (var i in idw){
            var issue = idw[i];

            module.exports.fillProjectTable(issue.info.id,issue.info.owner,issue.info.repo);
            module.exports.fillIssueTable(issue.issue.id,issue.info.id);

            for (var j in issue.call){
                var sentence = issue.call[j];

                module.exports.fillSentenceTable(0,issue.issue.id,sentence);
            }

            for (var j in issue.def){
                var sentence = issue.def[j];

                module.exports.fillSentenceTable(0,issue.issue.id,sentence);
            }

            for (var j in issue.msg){
                var sentence = issue.msg[j];

                module.exports.fillSentenceTable(issue.issue.id,0,sentence);
            }
        }
    }
};


function createProjectTable() {
    db.serialize(function () {
        db.run("CREATE TABLE IF NOT EXISTS project (id INT PRIMARY KEY, owner TEXT, repo TEXT)");
    });
};


function createIssueTable() {
    db.serialize(function () {
        db.run("CREATE TABLE IF NOT EXISTS issue (id INT PRIMARY KEY, project_id INT)");
    });
};


function createSentenceTable() {
    db.serialize(function () {
        db.run("CREATE TABLE IF NOT EXISTS sentence (issue_id INT , commit_id INT, sentence TEXT," +
            " UNIQUE (issue_id, commit_id, sentence) ON CONFLICT REPLACE)");
    });
};
