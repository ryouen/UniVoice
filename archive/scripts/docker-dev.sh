#!/bin/bash

# UniVoice Docker Development Script
set -e

echo "🐳 UniVoice Docker Development Environment"
echo "=========================================="

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to build and start development environment
start_dev() {
    echo "🚀 Starting UniVoice development environment..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
    echo "✅ Development environment started!"
    echo "📱 UniVoice is available at: http://localhost:5174"
    echo "🔍 To view logs: docker-compose logs -f univoice-dev"
}

# Function to stop development environment
stop_dev() {
    echo "🛑 Stopping UniVoice development environment..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
    echo "✅ Development environment stopped!"
}

# Function to restart development environment
restart_dev() {
    echo "🔄 Restarting UniVoice development environment..."
    stop_dev
    start_dev
}

# Function to run tests
run_tests() {
    echo "🧪 Running UniVoice tests..."
    docker-compose -f docker-compose.yml run --rm univoice-test npm run test
}

# Function to run performance tests
run_perf_tests() {
    echo "⚡ Running UniVoice performance tests..."
    docker-compose --profile performance -f docker-compose.yml run --rm univoice-perf npm run test:performance
}

# Function to clean up Docker resources
cleanup() {
    echo "🧹 Cleaning up Docker resources..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v --remove-orphans
    docker system prune -f
    echo "✅ Cleanup complete!"
}

# Function to show logs
show_logs() {
    echo "📋 Showing UniVoice logs..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f univoice-dev
}

# Function to enter development container
shell() {
    echo "🐚 Entering UniVoice development container..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec univoice-dev sh
}

# Main script logic
case "$1" in
    "start")
        check_docker
        start_dev
        ;;
    "stop")
        stop_dev
        ;;
    "restart")
        check_docker
        restart_dev
        ;;
    "test")
        check_docker
        run_tests
        ;;
    "perf")
        check_docker
        run_perf_tests
        ;;
    "logs")
        show_logs
        ;;
    "shell")
        shell
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|test|perf|logs|shell|cleanup}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the development environment"
        echo "  stop     - Stop the development environment"
        echo "  restart  - Restart the development environment"
        echo "  test     - Run tests in Docker"
        echo "  perf     - Run performance tests"
        echo "  logs     - Show application logs"
        echo "  shell    - Enter development container shell"
        echo "  cleanup  - Clean up Docker resources"
        exit 1
        ;;
esac