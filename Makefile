.PHONY: help start stop restart build logs clean reset-votes format

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

start: ## Start the application
	docker-compose up -d --build

stop: ## Stop the application
	docker-compose down

restart: ## Restart the application (stop and start)
	docker-compose down
	docker-compose up -d --build

build: ## Build the Docker image
	docker-compose build

logs: ## Show application logs
	docker-compose logs -f

logs-tail: ## Show last 100 lines of logs
	docker-compose logs --tail=100

status: ## Show container status
	docker-compose ps

clean: ## Stop and remove containers, volumes, and images
	docker-compose down -v --rmi local

shell: ## Open a shell in the running container
	docker-compose exec web sh

reset-votes: ## Reset all votes to 0 (requires confirmation)
	@echo "This will reset all votes to 0 in quotes.json"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@python3 -c "import json; data = json.load(open('quotes.json')); [q.update({'votes': 0}) for q in data]; json.dump(data, open('quotes.json', 'w'), indent=2)"
	@echo "All votes have been reset to 0"

format: ## Remove trailing whitespaces from all files
	@echo "Removing trailing whitespaces..."
	@find . -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" -o -name "Makefile" -o -name "*.sh" \) \
		! -path "./node_modules/*" \
		! -path "./.git/*" \
		! -name "package-lock.json" \
		-exec sed -i '' 's/[[:space:]]*$$//' {} \;
	@echo "Trailing whitespaces removed"

