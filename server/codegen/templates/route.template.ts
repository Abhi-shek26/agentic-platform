/**
 * Express Route Template
 * API route handlers with validation and error handling
 */

export const routeTemplate = (routeData: any): string => {
  const { method, path, name, params, body, middleware, logic, response } = routeData;

  const methodName = method.toLowerCase();
  const methodUpper = method.toUpperCase();
  const middlewareStr = middleware && middleware.length > 0 ? `, ${middleware.join(', ')}` : '';

  const validationLogic = body
    ? `const { ${Object.keys(body).join(', ')} } = req.body;
  if (!${Object.keys(body).join(' || !')}) {
    return res.status(400).json({ error: 'Missing required fields' });
  }`
    : '';

  const logicStr = logic || `// Implementation logic\nconst data = null;`;

  return `/**
 * ${methodUpper} ${path}
 * ${name || 'API endpoint'}
 */
router.${methodName}('${path}'${middlewareStr}, async (req, res) => {
  try {
    ${validationLogic}
    ${logicStr}

    res.json(${response || '{ data }'});
  } catch (error) {
    console.error('Error in ${methodUpper} ${path}:', error);
    res.status(500).json({ error: '${name || 'Request'} failed' });
  }
});
`;
};

/**
 * Example usage:
 * const route = routeTemplate({
 *   method: 'POST',
 *   path: '/api/register',
 *   name: 'Register participant',
 *   body: { email: 'string', rating: 'number' },
 *   middleware: ['requireAuth', 'validateInput'],
 *   logic: `const participant = await db.insert(participantsTable).values({
 *     email,
 *     rating,
 *     tournament_id: req.params.tournamentId
 *   });`,
 *   response: '{ participant }'
 * });
 */
