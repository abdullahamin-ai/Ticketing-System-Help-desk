.PHONY: help install dev test migrate upgrade downgrade docker-up docker-down

help:
\t@echo "Available commands:"
\t@echo "  install      Install dependencies"
\t@echo "  dev          Run the API in dev mode"
\t@echo "  test         Run the test suite"
\t@echo "  migrate msg= Create a new Alembic migration"
\t@echo "  upgrade      Apply database migrations"
\t@echo "  downgrade    Roll back the last migration"
\t@echo "  docker-up    Start Docker Compose stack"
\t@echo "  docker-down  Stop Docker Compose stack"

install:
\tpip install -r requirements.txt

dev:
\tuvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
\tpytest -q

migrate:
\talembic revision --autogenerate -m "$(msg)"

upgrade:
\talembic upgrade head

downgrade:
\talembic downgrade -1

docker-up:
\tdocker compose up --build

docker-down:
\tdocker compose down
