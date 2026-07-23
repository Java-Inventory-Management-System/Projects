.PHONY: infra dev test clean

infra:   ## Start only MySQL (for local BE/FE dev)
	docker compose up mysql -d

dev:     ## Start full stack (mysql + backend + frontend + nginx)
	docker compose up -d

test:    ## Run integration + E2E tests (CI entrypoint)
	docker compose build backend frontend
	docker compose -f docker-compose.yml -f docker-compose.test.yml up mysql backend -d --wait
	docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm test
	docker compose -f docker-compose.yml -f docker-compose.test.yml up frontend nginx -d --wait
	docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm e2e
	docker compose -f docker-compose.yml -f docker-compose.test.yml down -v

clean:   ## Stop all and remove volumes
	docker compose down -v
