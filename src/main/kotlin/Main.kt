package main.kotlin

import io.ktor.application.*
import io.ktor.client.engine.apache.*
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.content.TextContent
import io.ktor.features.CallLogging
import io.ktor.http.*
import io.ktor.http.content.*
import io.ktor.response.*
import io.ktor.routing.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import kotlinx.serialization.*
import kotlinx.serialization.json.JSON
import java.util.logging.SimpleFormatter
import java.util.logging.ConsoleHandler
import java.util.logging.Logger
import org.slf4j.event.Level
import java.io.File
import java.util.logging.Level.ALL


@Serializable
data class Secrets(val JiraToken: String)

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

    var epicsCache: String? = null;
    val issueCache = HashMap<String, HashMap<Int, String>>();

    val server = embeddedServer(Netty, port = 3001) {
        install(CallLogging) {
            level = Level.INFO
        }

        routing {
            static {
                staticRootFolder = File("client/build")
                default("index.html")
                file("*", "index.html")

                static("static") {
                    static("js") {
                        files("static/js")
                    }
                }
            }

            get("/api/epics") {
                val force: String = call.request.queryParameters["force"] ?: "false"
                if (force != "true" && epicsCache != null) {
                    call.respondText(epicsCache!!, ContentType.Application.Json)
                } else {
                    println("Loading epics...")
                    val responseText = client.post<String>("https://khanacademy.atlassian.net/rest/api/2/search") {
                        body = TextContent("{\"jql\":\"Project=CP AND \\\"Epic Name\\\" IS NOT NULL AND \\\"Epic Status\\\" != \\\"Done\\\"\"}", ContentType.Application.Json)
                        val token = secrets.JiraToken
                        header("Authorization", "Basic $token")
                    }
                    epicsCache = responseText
                    call.respondText(responseText, ContentType.Application.Json)
                }
            }

            get("/api/issues") {
                val startAt: Int = call.request.queryParameters["startAt"]?.toInt() ?: 0
                val force: String = call.request.queryParameters["force"] ?: "false"
                val epic: String = call.request.queryParameters["epic"]!!
                if (force != "true" && issueCache.containsKey(epic) && issueCache[epic]!!.containsKey(startAt)) {
                    call.respondText(issueCache[epic]!![startAt]!!, ContentType.Application.Json)
                } else {
                    println("Loading epic issues for $epic ($startAt)...")
                    val responseText = client.post<String>("https://khanacademy.atlassian.net/rest/api/2/search") {
                        body = TextContent("{\"jql\":\"\\\"Epic Link\\\"=$epic\",\"startAt\":$startAt}", ContentType.Application.Json)
                        val token = secrets.JiraToken
                        header("Authorization", "Basic $token")
                    }
                    if (!issueCache.containsKey(epic)) {
                        issueCache[epic] = HashMap<Int, String>()
                    }
                    issueCache[epic]!![startAt] = responseText
                    call.respondText(responseText, ContentType.Application.Json)
                }
            }
        }
    }
    server.start(wait = true)
}