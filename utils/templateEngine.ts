/**
 * Interpolates template variables in the format {{variableName}}
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

/**
 * Extracts variable names from a template string
 */
export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

/**
 * Validates that all required variables are present
 */
export function validateTemplateVariables(
  template: string,
  variables: Record<string, string>
): { valid: boolean; missing: string[] } {
  const required = extractTemplateVariables(template);
  const missing = required.filter(v => !variables[v]);
  return { valid: missing.length === 0, missing };
}
