.DEFAULT_GOAL := help

COMPOSE := docker compose
BACKEND := $(COMPOSE) exec backend

.PHONY: help start stop restart migrate stamp admin pull-models logs status

help: ## Show available commands
	@echo "DocNest — available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Typical first-time setup:"
	@echo "  make start && make pull-models && make migrate && make admin"

start: ## Start all services in the background
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example")
	$(COMPOSE) up -d --build
	@echo ""
	@echo "Services started:"
	@echo "  Frontend  http://localhost:5173"
	@echo "  API       http://localhost:8000/docs"
	@echo "  MinIO UI  http://localhost:9001"

stop: ## Stop all services
	$(COMPOSE) down
	@echo "All services stopped."

restart: stop start ## Restart all services

migrate: ## Run database migrations (safe if schema already exists)
	$(BACKEND) alembic upgrade head
	@echo "Migrations complete."

stamp: ## Mark migrations as applied without running them
	$(BACKEND) alembic stamp head
	@echo "Alembic stamped at head."

admin: ## Create admin user (interactive name, email, password)
	$(COMPOSE) exec -it backend python -m scripts.seed_admin --interactive

pull-models: ## Pull required Ollama models (first time only)
	$(COMPOSE) exec ollama ollama pull llama3.2
	$(COMPOSE) exec ollama ollama pull nomic-embed-text
	@echo "Ollama models ready."

logs: ## Tail logs from all services
	$(COMPOSE) logs -f

status: ## Show running service status
	$(COMPOSE) ps
