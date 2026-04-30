import { TFile, Vault } from "obsidian";
import {DEFAULT_SETTINGS} from "./settings";


export async function getRelevantMetadata(file: TFile, vault: Vault){
	
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
		const parents = Array<string>();
		let dateOfBirth;
		let dateofDeath;
		for (const property in frontmatter?.split(':').entries()){
			const propertyType = property.split('\n').pop();
			const propertyContent = property.split('\n').slice(0,-1);
			switch(propertyType){
				case DEFAULT_SETTINGS.parentsProperty:
					//PROPERTY TYPE = LIST
					for(const entry in propertyContent.entries){
						parents.push(entry.replace('/-/','').trim()); //TODO
						console.debug(`Found Parent ${entry}`);
					}
					console.debug(`Found ${parents.length} Parents`);
					break;
				case DEFAULT_SETTINGS.dateOfBirthProperty:
					//PROPERTY TYPE = STRING
					dateOfBirth=propertyContent[0]?.trim();
					break;
				case DEFAULT_SETTINGS.dateOfDeathProperty:
					//PROPERTY TYPE = STRING
					dateofDeath=propertyContent[0]?.trim();
					break;
				default:
					break;
			}
		}		
		// IN CONTENT
		//TO BE IMPLEMENTED

		return {dateOfBirth,dateofDeath,parents};
	});
	return relevant_metadata;
}
