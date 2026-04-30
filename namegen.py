# Generate First Names

import random
import sys
# Standard Vioza Input Format:
syllableScheme = '(C)V'
consonants = 'bdvzjmnl'
vowels = 'aeiou'
maxSyllables = 5
minSyllables = 2

print("Arguments: " + str(sys.argv[1:]))

syllableScheme = sys.argv[1] if len(sys.argv) > 1 else syllableScheme
consonants = sys.argv[2] if len(sys.argv) > 2 else consonants
vowels = sys.argv[3] if len(sys.argv) > 3 else vowels
minSyllables = int(sys.argv[4]) if len(sys.argv) > 4 else minSyllables
maxSyllables = int(sys.argv[5]) if len(sys.argv) > 5 else maxSyllables
numberToGenerate = int(sys.argv[6]) if len(sys.argv) > 6 else 1000000

nameSet = set()
for j in range(numberToGenerate):
	name = ''
	for i in range(random.randint(minSyllables, maxSyllables)):
		maySkip = False
		for char in syllableScheme:
			if char == '(':
				maySkip = True
			elif char == ')':
				maySkip = False
			elif maySkip and random.random() < 0.25:
				continue
			elif char == 'C':
				name += random.choice(consonants)
			elif char == 'V':
				vowel = random.choice(vowels)
				while name.endswith(vowel):
					vowel = random.choice(vowels)
				name += vowel
		if i == 0:
			name = name.capitalize()

	hasConsonant = False
	for char in name:
		if char in consonants:
			hasConsonant = True
			break
	if hasConsonant:
		nameSet.add(name)

with open('first-names-test.txt', 'w') as f:
	for name in nameSet:
		f.write(name + '\n')
	f.close()
