// apps/api/src/scripts/verify-logic.test.mjs
import assert from "node:assert";
import { test } from "vitest";

function buildUpdateQuery(updates, allowedColumns) {
  if (updates.length === 0) return null;
  const setClause = updates
    .map((u) => {
      if (!allowedColumns.includes(u.col)) throw new Error(`Invalid column: ${u.col}`);
      return `${u.col} = ?`;
    })
    .join(", ");
  return {
    sql: `UPDATE table SET ${setClause}, updated_at = datetime('now') WHERE id = ?`,
    params: [...updates.map((u) => u.val), "some-id"]
  };
}

test('verify logic script', () => {
  // Test cases for users.ts refactor
  const USER_ALLOWED = ["display_name", "avatar_key", "banner_key"];
  console.log("Testing users.ts refactor logic...");

  const userTest1 = buildUpdateQuery(
    [{ col: "display_name", val: "New Name" }],
    USER_ALLOWED
  );
  assert.strictEqual(userTest1.sql, "UPDATE table SET display_name = ?, updated_at = datetime('now') WHERE id = ?");
  assert.deepStrictEqual(userTest1.params, ["New Name", "some-id"]);

  const userTest2 = buildUpdateQuery(
    [
      { col: "display_name", val: "New Name" },
      { col: "avatar_key", val: "key123" }
    ],
    USER_ALLOWED
  );
  assert.strictEqual(userTest2.sql, "UPDATE table SET display_name = ?, avatar_key = ?, updated_at = datetime('now') WHERE id = ?");
  assert.deepStrictEqual(userTest2.params, ["New Name", "key123", "some-id"]);

  assert.throws(() => {
    buildUpdateQuery([{ col: "malicious_col", val: "value" }], USER_ALLOWED);
  }, /Invalid column: malicious_col/);

  // Test cases for recipes.ts refactor
  const RECIPE_ALLOWED = ["title", "description", "category", "visibility", "ingredients_json", "steps_json", "image_key"];
  console.log("Testing recipes.ts refactor logic...");

  const recipeTest1 = buildUpdateQuery(
    [{ col: "title", val: "New Recipe" }, { col: "visibility", val: "public" }],
    RECIPE_ALLOWED
  );
  assert.strictEqual(recipeTest1.sql, "UPDATE table SET title = ?, visibility = ?, updated_at = datetime('now') WHERE id = ?");
  assert.deepStrictEqual(recipeTest1.params, ["New Recipe", "public", "some-id"]);

  console.log("All logic tests passed!");
});
