import { TFile, Vault } from "obsidian";
import {StammbaumPluginSettings} from "./settings";


export async function getRelevantMetadata(file: TFile, vault: Vault, settings: StammbaumPluginSettings){
	
	const relevant_metadata = await vault.cachedRead(file).then(data => {
		if (!data.startsWith('---')) {
			console.error("File does not start with frontmatter but with " + data.substring(0,10));
			return null;
		}
		const splitContent = data.split('---');
		if(splitContent.length < 3) {
			console.error("No content beyond the frontmatter, \
				terminating as to not accidently mistake files starting\
				with a horizontal line as starting with a frontmatter and\
				wrongfully assuming the page content is the frontmatter.");
			return null;
		} // 
		const frontmatter = splitContent[1];
			//const fileContent = splitContent.slice(2);
		// Extract from frontmatter
		/*
		Important Parameters:
		- IN FRONTMATTER:
		- Parents
		- Date of Birth
		- Date of Death
		- 
		- IN CONTENT:
		- Relationships
		- 
		*/
		console.debug(frontmatter);
		const parents = Array<string>();
		let dateOfBirth;
		let dateOfDeath;
		frontmatter?.split(':').forEach((property,i,array) => {
			const propertyType = property.split('\n').pop();
			const propertyContent = array[i+1]?.split('\n').slice(0,-1);
			console.debug(property,propertyType,propertyContent);
			console.debug(settings);
			if(propertyContent){
				switch(propertyType?.trim()){
					case settings.parentsProperty:
						//PROPERTY TYPE = LIST
						propertyContent.shift();
						propertyContent.forEach(entry => {
							entry = entry.replace('-','').trim();
							parents.push(entry); //TODO
							console.debug(`Found Parent ${entry}`);
						})
						console.debug(`Found ${parents.length} Parents`);
						break;
					case settings.dateOfBirthProperty:
						//PROPERTY TYPE = STRING
						dateOfBirth=propertyContent[0]?.trim();
						break;
					case settings.dateOfDeathProperty:
						//PROPERTY TYPE = STRING
						dateOfDeath=propertyContent[0]?.trim();
						console.debug(`Found date of death ${dateOfDeath}`);
						break;
					default:
						break;
				}
			}
		});		
		// IN CONTENT
		//TO BE IMPLEMENTED
		console.debug(`Found date of birth ${dateOfBirth} and date of death ${dateOfDeath}`);
		return {dateOfBirth: dateOfBirth,dateOfDeath: dateOfDeath,parents: parents};
	});
	console.debug(relevant_metadata);
	return relevant_metadata;
}
