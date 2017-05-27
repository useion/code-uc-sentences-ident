from nltk.corpus import wordnet as wn
import json


def findsyn(default):
    "Find synonyms for default - return in JSON"
    word_set = set()
    word_arr = []
    synonyms = wn.synsets(default)
    for lemma in synonyms:
        for word in lemma.lemma_names():
            if ((default != word) and (word not in word_set)):
                word_arr.append(word)
                word_set.add(word)

    message = json.dumps(word_arr)
    return message
