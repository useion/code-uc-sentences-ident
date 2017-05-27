import nltk
import json


def findtag(sentence):
    "Get tags for words... return JSON"
    result = nltk.pos_tag(nltk.word_tokenize(sentence))
    json_result = json.dumps(result)
    return json_result
