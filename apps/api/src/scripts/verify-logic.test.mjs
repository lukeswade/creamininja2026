// apps/api/src/scripts/verify-logic.test.mjs
import { describe, it, expect } from "vitest";

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

describe("verify-logic", () => {
  it("users.ts refactor logic", () => {
    const USER_ALLOWED = ["display_name", "avatar_key", "banner_key"];

    const userTest1 = buildUpdateQuery(
      [{ col: "display_name", val: "New Name" }],
      USER_ALLOWED
    );
    expect(userTest1.sql).toBe("UPDATE table SET display_name = ?, updated_at = datetime('now') WHERE id = ?");
    expect(userTest1.params).toEqual(["New Name", "some-id"]);

    const userTest2 = buildUpdateQuery(
      [
        { col: "display_name", val: "New Name" },
        { col: "avatar_key", val: "key123" }
      ],
      USER_ALLOWED
    );
    expect(userTest2.sql).toBe("UPDATE table SET display_name = ?, avatar_key = ?, updated_at = datetime('now') WHERE id = ?");
    expect(userTest2.params).toEqual(["New Name", "key123", "some-id"]);

    expect(() => {
      buildUpdateQuery([{ col: "malicious_col", val: "value" }], USER_ALLOWED);
    }).toThrowError(/Invalid column: malicious_col/);
  });

  it("recipes.ts refactor logic", () => {
    const RECIPE_ALLOWED = ["title", "description", "category", "visibility", "ingredients_json", "steps_json", "image_key"];

    const recipeTest1 = buildUpdateQuery(
      [{ col: "title", val: "New Recipe" }, { col: "visibility", val: "public" }],
      RECIPE_ALLOWED
    );
    expect(recipeTest1.sql).toBe("UPDATE table SET title = ?, visibility = ?, updated_at = datetime('now') WHERE id = ?");
    expect(recipeTest1.params).toEqual(["New Recipe", "public", "some-id"]);
  });
});
