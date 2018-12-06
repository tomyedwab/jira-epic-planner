import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    val kotlinVersion = "1.3.0"
    application
    id("org.jetbrains.kotlin.jvm") version kotlinVersion
    id("org.jetbrains.kotlin.plugin.spring") version kotlinVersion
    id("org.jetbrains.kotlin.plugin.jpa") version kotlinVersion
    id("kotlinx-serialization") version kotlinVersion
}

application {
    mainClassName = "main.kotlin.MainKt"
}

repositories {
    jcenter()
    mavenCentral()
    maven { setUrl("http://dl.bintray.com/kotlin/ktor") }
    maven { setUrl("http://dl.bintray.com/kotlin/kotlinx") }
}

dependencies {
    val ktorVersion = "1.0.1"
    compile("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    compile("org.jetbrains.kotlinx:kotlinx-serialization-runtime:0.9.0")
    compile("io.ktor:ktor:$ktorVersion")
    compile("io.ktor:ktor-server-netty:$ktorVersion")
    compile("io.ktor:ktor-client-core:$ktorVersion")
    compile("io.ktor:ktor-auth:$ktorVersion")
    compile("io.ktor:ktor-html-builder:$ktorVersion")
    compile("io.ktor:ktor-client-apache:$ktorVersion")
    compile("org.slf4j:slf4j-simple:1.6.1")
}
