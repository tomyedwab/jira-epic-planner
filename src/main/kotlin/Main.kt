package main.kotlin

import io.ktor.application.*
import io.ktor.client.engine.apache.*
import io.ktor.client.request.header
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.content.TextContent
import io.ktor.features.CallLogging
import io.ktor.http.ContentType.Application.Json as ContentTypeJson
import io.ktor.http.ContentType.Application.FormUrlEncoded as ContentTypeFormUrlEncoded
import io.ktor.http.content.*
import io.ktor.response.*
import io.ktor.routing.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import kotlinx.coroutines.*
import kotlinx.serialization.*
import kotlinx.serialization.Optional
import kotlinx.serialization.json.*
import java.util.logging.SimpleFormatter
import java.util.logging.ConsoleHandler
import java.util.logging.Logger
import org.slf4j.event.Level
import java.io.File
import java.util.*
import java.util.logging.Level.ALL

// TODO: Auto-clear cache after some timeout

@Serializable
data class ProjectConfig(
    val ProjectName: String,
    @Optional val PingboardGroup: Int? = null,
    val ProjectFilter: String
)

@Serializable
data class Secrets(
    val JiraToken: String,
    val PingboardClientId: String,
    val PingboardSecret: String,
    val ProjectConfigs: Map<String, ProjectConfig>
)

// Data schema from the Jira API

@Serializable
data class IssueResultType(
        val name: String
)

@Serializable
data class IssueResultAssignee(
        val displayName: String
)

@Serializable
data class IssueResultStatus(
        val name: String
)

@Serializable
data class IssueResultLinkType(
        val name: String
)

@Serializable
data class IssueResultLinkIssue(
        val key: String
)

@Serializable
data class IssueResultLink(
        val type: IssueResultLinkType,
        @Optional val outwardIssue: IssueResultLinkIssue? = null
)

@Serializable
data class IssueResultFields(
        val summary: String,
        val issuetype: IssueResultType,
        @Optional val assignee: IssueResultAssignee? = null,
        val status: IssueResultStatus,
        // Estimate
        @Optional val customfield_10105: Float? = null,
        // Epic key
        @Optional val customfield_10006: String? = null,
        // Epic short name
        @Optional val customfield_10003: String? = null,
        // Sprint links (garbled)
        @Optional val customfield_10103: Array<String>? = null,
        @Optional val labels: Array<String>? = null,
        @Optional val subtasks: Array<IssueResult>? = null,
        @Optional val issuelinks: Array<IssueResultLink>? = null
)

@Serializable
data class IssueResult(
        @Optional val expand: String? = null,
        val id: String,
        val key: String,
        val self: String,
        val fields: IssueResultFields
)

interface APIResults<T> {
    val issues: Array<T>
}

@Serializable
data class IssueResults(
        @Optional val expand: String = "",
        val startAt: Int,
        val maxResults: Int,
        val total: Int,
        override val issues: Array<IssueResult>
): APIResults<IssueResult>

// Pre-processed data in client-usable form

@Serializable
data class Epic(
        val key: String,
        val summary: String,
        val shortName: String
)

@Serializable
data class Issue(
        val key: String,
        val type: String,
        val summary: String,
        val epic: String?,
        val assignee: String?,
        val status: String?,
        val estimate: Float?,
        val subteam: String?,
        val subtasks: List<String>,
        val sprints: List<Int>,
        val blocks: List<String>
)

@Serializable
data class Sprint(
        val id: Int,
        val name: String,
        val state: String?,
        val startDate: String?,
        val endDate: String?
)

@Serializable
data class JiraCache(
        val updateTime: Long,
        val epics: List<Epic>,
        val issues: List<Issue>,
        val sprints: Map<String, Sprint>
)

// Data schema from Pingboard

@Serializable
data class TokenResult(
        val access_token: String
)

@Serializable
data class UserStatus(
        val id: String,
        val message: String?,
        val starts_at: String,
        val ends_at: String,
        val status_type_id: Int
)

@Serializable
data class User(
        val id: String,
        val first_name: String,
        val last_name: String,
        @Optional var ooos: List<UserStatus> = emptyList()
)

@Serializable
data class GroupLinkedResult(
        val users: List<User>
)

@Serializable
data class GroupResult(
        val linked: GroupLinkedResult
)

@Serializable
data class StatusType(
        val id: String,
        val slug: String
)

@Serializable
data class StatusLinkedResult(
        val status_types: List<StatusType>
)

@Serializable
data class StatusResult(
        val statuses: List<UserStatus>,
        @Optional val linked: StatusLinkedResult? = null
)

@Serializable
data class TeamCache(
        val updateTime: Long,
        val members: List<User>
)

fun getIssueSubteam(issue: IssueResult): String? = when {
    issue.fields.issuetype.name == "Design Task" -> "Design"
    issue.fields.labels?.contains("frontend") ?: false && issue.fields.labels?.contains("backend") ?: false -> "Front/Backend"
    issue.fields.labels?.contains("frontend") ?: false -> "Frontend"
    issue.fields.labels?.contains("backend") ?: false -> "Backend"
    else -> null
}

fun sprintName(year: String, sprintId: String): String? = when {
    sprintId.length == 2 -> "$year-$sprintId"
    sprintId.length == 1 -> "$year-0$sprintId"
    else -> {
        println("Invalid sprint name $year-$sprintId")
        null
    }
}

fun extractIssueSprints(issue: IssueResult, sprints: HashMap<String, Sprint>): List<Int> {
    return issue.fields.customfield_10103?.mapNotNull {
        // Extract parameters between parentheses
        val match = Regex("^[^\\[]+\\[(.+)\\]$").matchEntire(it.replace("\n", ""))
        val body = match?.groupValues?.get(1)
        if (body == null) {
            println("Invalid sprint string $it")
            return@mapNotNull null
        }

        // Split parameters as key=value,key=value,etc.
        val params = body
                .split(",")
                .map { it.split("=") }
                .mapNotNull { when {
                    it.size == 2 -> it[0] to it[1]
                    else -> null
                } }
                .toMap()

        // Create the sprint if it doesn't already exist
        val sprintId = params.get("id")
        if (sprintId == null) {
            println("Missing sprint ID in params $body")
            return@mapNotNull null
        }
        val sprintIdInt = sprintId.toInt()
        if (!sprints.containsKey(sprintId)) {
            /*
            val sprintOrigName = params.get("name") ?: ""

            // CP 2019
            val recp19 = Regex("^\\[CP\\] Sprint (\\d+-\\d+).*$").matchEntire(sprintOrigName)
            // TP 2019
            val retp19 = Regex("^TP.+ (\\d+) Sprint (\\d+).*$").matchEntire(sprintOrigName)
            // CLASS 2019
            val recl19 = Regex("^CLASS (\\d+) .+ Sprint (\\d+).*$").matchEntire(sprintOrigName)
            // LP 2019
            val relp19 = Regex("^\\[TP\\] .+ Sprint (\\d+).*$").matchEntire(sprintOrigName)
            // CP 2018
            val recp18 = Regex("^.+ Sprint (\\d+).*$").matchEntire(sprintOrigName)
            var sprintName = when {
                recp19 != null && recp19.groupValues.size > 1 -> recp19.groupValues[1]
                retp19 != null && retp19.groupValues.size > 2 -> sprintName(retp19.groupValues[1], retp19.groupValues[2])
                recl19 != null && recl19.groupValues.size > 2 -> sprintName(recl19.groupValues[1], recl19.groupValues[2])
                relp19 != null && relp19.groupValues.size > 1 -> sprintName("2019", relp19.groupValues[1])
                recp18 != null && recp18.groupValues.size > 1 -> sprintName("2018", recp18.groupValues[1])
                else -> {
                    println("Invalid sprint name $sprintOrigName")
                    return@mapNotNull null
                }
            } ?: return@mapNotNull null
            */

            val name = params.get("name")
            if (name != null) {
                val sprint = Sprint(
                        id=sprintIdInt,
                        name=name,
                        state=params.get("state"),
                        startDate=params.get("startDate"),
                        endDate=params.get("endDate"))
                sprints.set(sprintId, sprint)
            }
        }

        sprintIdInt
    } ?: emptyList()
}

suspend fun<T, V: APIResults<T>> issueSearchRequest(client: io.ktor.client.HttpClient, secrets: Secrets, serializer: DeserializationStrategy<V>, projectKey: String, query: String): List<T> {
    var startAt = 0
    val results = ArrayList<T>()
    while (true) {
        val responseText = client.post<String>("https://khanacademy.atlassian.net/rest/api/2/search") {
            body = TextContent("{\"jql\":\"$query\",\"startAt\":$startAt}", ContentTypeJson)
            val token = secrets.JiraToken
            header("Authorization", "Basic $token")
        }
        val result = JSON.nonstrict.parse(serializer, responseText)
        val cnt = result.issues.size
        println("$projectKey: Got $cnt issues")
        if (result.issues.isEmpty()) {
            break
        }
        results.addAll(result.issues)
        startAt += result.issues.size
    }
    return results.toList()
}

suspend fun updateJiraCache(client: io.ktor.client.HttpClient, secrets: Secrets, projectKey: String, ProjectFilter: String): JiraCache {
    val sprints = HashMap<String, Sprint>()

    println("$projectKey: Loading issues...")
    val issueResults = issueSearchRequest<IssueResult, IssueResults>(client, secrets, IssueResults.serializer(), projectKey,
            ProjectFilter)

    val epics = issueResults
            .filter { it.fields.customfield_10003 != null }
            .map { Epic(it.key, it.fields.summary, it.fields.customfield_10003!!) }

    val issues = issueResults
            .filter { it.fields.customfield_10003 == null }
            .map { Issue(
                it.key, it.fields.issuetype.name, it.fields.summary, it.fields.customfield_10006,
                it.fields.assignee?.displayName, it.fields.status.name,
                it.fields.customfield_10105, getIssueSubteam(it), it.fields.subtasks?.map { it.key } ?: emptyList(),
                extractIssueSprints(it, sprints),
                it.fields.issuelinks?.mapNotNull { when {
                    it.type.name == "Blocks" -> it.outwardIssue?.key
                    else -> null
                } } ?: emptyList()
    ) }

    println("$projectKey: Loaded data from Jira API.")

    return JiraCache(Date().time, epics, issues, sprints)
}

suspend fun getPingboardToken(client: io.ktor.client.HttpClient, secrets: Secrets): String {
    println("Getting Pingboard access token...")
    val responseText = client.post<String>("https://app.pingboard.com/oauth/token?grant_type=client_credentials") {
        body = TextContent("client_id=${secrets.PingboardClientId}&client_secret=${secrets.PingboardSecret}", ContentTypeFormUrlEncoded)
    }
    val tokenResult = JSON.nonstrict.parse(TokenResult.serializer(), responseText)
    return tokenResult.access_token
}

suspend fun updatePingboardData(client: io.ktor.client.HttpClient, accessToken: String, projectKey: String, PingboardGroup: Int?): TeamCache {
    if (PingboardGroup == null) {
        return TeamCache(Date().time, emptyList())
    }

    // Get the group data
    println("$projectKey: Getting user information...")
    val groupResponseText = client.get<String>("https://app.pingboard.com/api/v2/groups/$PingboardGroup?include=users") {
        header("Authorization", "Bearer $accessToken")
    }

    val groupResult = JSON.nonstrict.parse(GroupResult.serializer(), groupResponseText)

    var oooTypeId: String? = null
    groupResult.linked.users.forEach {
        println("Loading statuses for ${it.first_name} ${it.last_name}")
        val include = if (oooTypeId == null) "status_type" else ""
        val statusResponseText = client.get<String>("https://app.pingboard.com/api/v2/statuses?include=$include&user_id=${it.id}&page_size=999") {
            header("Authorization", "Bearer ${accessToken}")
        }
        val statusResponse = JSON.nonstrict.parse(StatusResult.serializer(), statusResponseText)
        if (oooTypeId == null && statusResponse.linked != null) {
            for (type in statusResponse.linked.status_types) {
                if (type.slug == "flex-time-off") {
                    oooTypeId = type.id
                    break
                }
            }
        }
        if (oooTypeId == null) {
            println("$projectKey: Error: flex-time-off status type not found!")
        }
        it.ooos = statusResponse.statuses.filter { it.status_type_id.toString() == oooTypeId }
    }

    println("$projectKey: Loaded data from Pingboard API.")

    return TeamCache(Date().time, groupResult.linked.users)
}

fun main(args: Array<String>) {
    // Set up logging
    val log = Logger.getLogger("my.logger")
    log.setLevel(ALL)
    val handler = ConsoleHandler()
    handler.formatter = SimpleFormatter()
    handler.setLevel(ALL);
    log.addHandler(handler)

    // Load secrets
    val secrets = JSON.parse(Secrets.serializer(), File("./config/secrets.json").readText(Charsets.UTF_8))

    // HTTP client to use to talk to Jira API
    val client = io.ktor.client.HttpClient(Apache)

    val pingboardToken = runBlocking {
        getPingboardToken(client, secrets)
    }

    val teamCaches = HashMap<String, TeamCache>()
    val jiraCaches = HashMap<String, JiraCache>()

    val teamJobs = secrets.ProjectConfigs.keys.map { projectKey -> GlobalScope.launch {
        val PingboardGroup = secrets.ProjectConfigs.getValue(projectKey).PingboardGroup
        teamCaches[projectKey] = updatePingboardData(client, pingboardToken, projectKey, PingboardGroup)
    } }

    val jiraJobs = secrets.ProjectConfigs.keys.map { projectKey -> GlobalScope.launch {
        val ProjectFilter = secrets.ProjectConfigs.getValue(projectKey).ProjectFilter
        jiraCaches[projectKey] = updateJiraCache(client, secrets, projectKey, ProjectFilter)
    } }

    // Wait for all the dust to settle
    runBlocking {
        teamJobs.forEach { it.join() }
        jiraJobs.forEach { it.join() }
    }

    val server = embeddedServer(Netty, port = 3001) {
        install(CallLogging) {
            level = Level.INFO
        }

        routing {
            static {
                staticRootFolder = File("client/build")
                default("index.html")
                file("*", "index.html")
                secrets.ProjectConfigs.keys.forEach { projectKey -> file("${projectKey}/*", "index.html")}

                static("static") {
                    static("js") {
                        files("static/js")
                    }
                }
            }

            get("/api/{project}/meta") {
                val projectKey = call.parameters["project"]
                val config = secrets.ProjectConfigs.get(projectKey)
                if (projectKey == null || config == null) {
                    throw Error("Project $projectKey not configured.")
                }
                call.respondText(JSON.stringify(ProjectConfig.serializer(), config), ContentTypeJson)
            }

            get("/api/{project}/jira") {
                val projectKey = call.parameters["project"]
                val config = secrets.ProjectConfigs.get(projectKey)
                if (projectKey == null || config == null) {
                    throw Error("Project $projectKey not configured.")
                }
                val force: String = call.request.queryParameters["force"] ?: "false"
                if (force == "true") {
                    jiraCaches[projectKey] = runBlocking {
                        updateJiraCache(client, secrets, projectKey, config.ProjectFilter)
                    }
                }
                val cache = jiraCaches.get(projectKey) ?: throw Error("Project $projectKey data missing.")
                call.respondText(JSON.stringify(JiraCache.serializer(), cache), ContentTypeJson)
            }

            get("/api/{project}/pingboard") {
                val projectKey = call.parameters["project"]
                val config = secrets.ProjectConfigs.get(projectKey)
                if (projectKey == null || config == null) {
                    throw Error("Project $projectKey not configured.")
                }
                val force: String = call.request.queryParameters["force"] ?: "false"
                if (force == "true") {
                    teamCaches[projectKey] = runBlocking {
                        updatePingboardData(client, pingboardToken, projectKey, config.PingboardGroup)
                    }
                }
                val cache = teamCaches.get(projectKey) ?: throw Error("Project $projectKey data missing.")
                call.respondText(JSON.stringify(TeamCache.serializer(), cache), ContentTypeJson)
            }
        }
    }
    server.start(wait = true)
}
