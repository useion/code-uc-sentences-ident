import zerorpc
from findingSyn import findsyn
from findingTag import findtag
from semanticSimilarity import similarity


class GetSynRPC(object):
    def getsyn(self, word):
        "Returns synonyms in JSON format"
        return findsyn(word)

    def gettag(self, sentence):
        "Returns words from a sentence with tags in JSON"
        print("recieved " + sentence)
        result = findtag(sentence)
        print("sent " + result)
        return result

    def getsim(self, sentences):
        "Returns similarity for two sentences"

        print(sentences[0])
        print(sentences[1])
        sim1 = similarity(sentences[0], sentences[1], False);
        #sim1 = similarity(sentences[0], sentences[1], True);
        print(sim1)
        return sim1


s = zerorpc.Server(GetSynRPC())
s.bind("tcp://0.0.0.0:4242")

print("server sa spusta")
s.run()
