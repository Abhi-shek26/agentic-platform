#!/bin/bash
# Fix all remaining agent imports

cd server/ai/agents

for file in backend.ts config.ts database.ts frontend.ts integration.ts qa.ts; do
  echo "Fixing $file..."
  # Replace import
  sed -i 's/import { model } from "..\/client"/import { callGemini } from "..\/client"/g' "$file"
  # Replace API call pattern
  sed -i 's/const result = await model\.generateContent(\[{ text: prompt }\]);/const parsedResponse = await callGemini(prompt);/g' "$file"
  sed -i 's/const responseText = result\.response\.text();/\/\/ Response already parsed by callGemini/g' "$file"
done

echo "✅ All agents fixed!"
