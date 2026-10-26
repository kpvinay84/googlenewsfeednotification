import fs from 'fs';
import YAML from 'yaml'; // Handles deep syntax checking

try {  

  // 1. Check deploy.yaml syntax
  const yamlContent = fs.readFileSync('./.github/workflows/deployment.yml', 'utf8');
  
  // This completely validates the syntax structure and catches layout/formatting errors
  YAML.parse(yamlContent); 
  console.log('✅ deployment.yml syntax is completely valid.');

} catch (error) {
  console.error('❌ Validation Failed:\n', error.message);
  process.exit(1);
}
