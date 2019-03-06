run: PHONY
	-docker stop jira-epic-planner
	-docker rm jira-epic-planner
	-docker stop jira-epic-planner-ssl
	-docker rm jira-epic-planner-ssl
	docker build -t tomyedwab/jira-epic-planner .
	docker run -d \
		--name jira-epic-planner \
		--network=jira-epic-planner-nw \
		-v /home/ubuntu/jira-epic-planner/config:/app/config \
		tomyedwab/jira-epic-planner
	docker run \
		--name jira-epic-planner-ssl \
		--network=jira-epic-planner-nw \
		-v /home/ubuntu/jira-epic-planner/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
		-v /home/ubuntu/jira-epic-planner/nginx/logs:/etc/nginx/logs \
		-v /etc/letsencrypt:/etc/letsencrypt \
		-p 8000:3000 \
		-d nginx

make-network: PHONY
	docker network create -d bridge --subnet 172.25.0.0/16 jira-epic-planner-nw

PHONY:
