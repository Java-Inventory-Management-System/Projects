import { execSync } from "child_process"

const COMPOSE = "/home/dawnbreaker/Downloads/code/Projects"

export function cleanupProduct1() {
  try {
    execSync(
      `docker compose exec mysql mysql -uroot -p123456 inventory_db -e "DELETE FROM product_units WHERE product_id = 1"`,
      { cwd: COMPOSE, timeout: 10000, stdio: "pipe" },
    )
  } catch {
    // foreign key – cascade via disabling checks
    execSync(
      `docker compose exec mysql mysql -uroot -p123456 inventory_db -e "SET FOREIGN_KEY_CHECKS = 0; DELETE FROM product_units WHERE product_id = 1; SET FOREIGN_KEY_CHECKS = 1;"`,
      { cwd: COMPOSE, timeout: 10000, stdio: "pipe" },
    )
  }
}
