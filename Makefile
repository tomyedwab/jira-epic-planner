run: PHONY
	-docker stop jira-epic-planner
	-docker rm jira-epic-planner
	docker build -t tomyedwab/jira-epic-planner .
	docker run -d --name jira-epic-planner -p 8001:3001 -p 8000:9091 \
		-v /home/ubuntu/jira-epic-planner/config:/app/config \
		-v /home/ubuntu/jira-epic-planner/www-temp/.well-known:/app/client/build/.well-known \
		--rm tomyedwab/jira-epic-planner

PHONY:
