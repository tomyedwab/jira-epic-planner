package main.kotlin

import com.typesafe.config.Optional
import io.ktor.application.*
import io.ktor.client.request.get
import io.ktor.client.engine.apache.*
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.content.TextContent
import io.ktor.features.CallLogging
import io.ktor.html.*
import io.ktor.http.*
import io.ktor.http.content.default
import io.ktor.http.content.files
import io.ktor.http.content.static
import io.ktor.response.*
import io.ktor.routing.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import kotlinx.coroutines.*
import kotlinx.html.*
import kotlinx.serialization.*
import kotlinx.serialization.internal.*
import kotlinx.serialization.json.JSON
import kotlinx.serialization.json.JsonParsingException
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

    val server = embeddedServer(Netty, port = 8080) {
        install(CallLogging) {
            level = Level.INFO
        }

        routing {
            static("static") {
                files("static/js")
            }

            get("/") {
                call.respondHtml {
                    head {
                        title { +"Jira Epic Planner" }
                        script(src = "/static/main.js") {}
                    }
                    body {
                        p {
                            +"Hello, Kotlin!"
                        }
                    }
                }
            }

            get("/issues") {
                val startAt: Int = call.request.queryParameters["startAt"]?.toInt() ?: 0
                val responseText = client.post<String>("https://khanacademy.atlassian.net/rest/api/2/search") {
                    body = TextContent("{\"jql\":\"\\\"Epic Link\\\"=CP-719\",\"startAt\":$startAt}", ContentType.Application.Json)
                    val token = secrets.JiraToken
                    header("Authorization", "Basic $token")
                }
                call.respondText(responseText, ContentType.Application.Json)
            }
        }
    }
    server.start(wait = true)
}