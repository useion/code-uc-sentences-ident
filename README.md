# Calculate similarity between use case and code based on:

The method of calculating similarity can be chosen (parameter --method):

- direct: based on sentences from use cases and code
- issue: based on relations between issues and commits from GitHub

In case of the issue method, change GitHub token here: `lib/githubAPI.js`

The similarity algorithm can be chosen (parameter --similarity):

- simple: Levenshtein distance (Levenshtein distance is implemented in the similarity module available at https://www.npmjs.com/package/similarity
- advanced: sentence similarity based on semantic nets and corpus statistics (the script implementing sentence similarity based on semantic nets and corpus statistics is available at https://github.com/sujitpal/nltk-examples/blob/master/src/semantic/short_sentence_similarity.py)

# Installing

## Dependencies

    npm install
    mkdir cache
    git clone https://github.com/useion/useion.git
    cd useion
    npm install
    sudo pip2.7 install zerorpc
    sudo pip2.7 install functools32

## NLTK

Install NLTK in your system. For Gentoo, type:

    emerge dev-python/nltk 

Download dictionary, tokenizer, and POS tagger:

    python
    import nltk;
    nltk.donwload();

Select:

* wordnet
* models/punkt
* models/maxent_treebank_pos_tagger

# Running

To calculate the similarity, it is required to run the following scripts:

`traverse.js` to calculate the similarity (it is required to run `python nltkinterface/rpc-server.py` prior to running this script)

Here are examples how to run them:

    python nltkinterface/rpc-server.py &
    node traverse.js --method METHOD --similarity SIMILARITY --uc-path UC_PATH --code-path CODE_PATH --lang LANG --issue-owner IO --issue-repo IR

Another one:

    node traverse.js --uc-path example/spec --code-path example/implementation --method direct --similarity advanced --lang php --issue-owner opencart --issue-repo opencart

The legend:

| UC_PATH   | path to the use cases      |
| CODE_PATH | path to the implementation | 
| METHOD    | direct or issue            | 
| SIMILARITY| simple or advanced         | 
| LANG      | programming language, e.g. php       |
| IO        | issue owner (GitHub), e.g. opencart  |
| IR        | issue repository, e.g. opencart      |

# Authors

* Peter Berta - code
* Michal Bystricky - readme, refactoring, fixing the algorithm


