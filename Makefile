run: PHONY
	docker build -t tomyedwab/jira-epic-planner .
	-docker stop jira-epic-planner
	-docker rm jira-epic-planner
	docker run -d --name jira-epic-planner -p 8000:3001 -v /home/ubuntu/jira-epic-planner/config:/app/config --rm tomyedwab/jira-epic-planner

PHONY:
