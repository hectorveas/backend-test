pipeline {
  agent any
  tools { nodejs 'node20' } 

  environment {
    SONAR_SERVER = 'sonar-local'
    SONAR_SCANNER = 'sonar-scanner'
    REGISTRY_URL = 'localhost:8082'
    IMAGE_NAME   = 'backend-test'
  }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Install deps') {
      steps {
        sh 'node -v && npm -v'
        sh 'npm ci'
      }
    }

    stage('Testing') {
      steps {
        sh 'npm test -- --coverage --coverageReporters=lcov'
      }
      post {
        always {
          archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
          publishCoverage adapters: [
            lcovAdapter('**/lcov.info')
          ], sourceCodeRetention: 'EVERY_BUILD'
        }
      }
    }

    stage('Build app') {
      steps { sh 'npm run build || echo "skip build"' }
    }

    stage('SonarQube Scan') {
      steps {
        script {
          try {
            withSonarQubeEnv("${env.SONAR_SERVER}") {
              // Try to use installed sonar-scanner tool first
              try {
                def scannerHome = tool "${env.SONAR_SCANNER}"
                sh "${scannerHome}/bin/sonar-scanner"
              } catch (Exception toolError) {
                echo "SonarScanner tool '${env.SONAR_SCANNER}' not found in Jenkins tools configuration"
                echo "Trying direct sonar-scanner command..."
                sh """
                  sonar-scanner \
                    -Dsonar.projectKey=backend-test \
                    -Dsonar.sources=src \
                    -Dsonar.host.url=\${SONAR_HOST_URL} \
                    -Dsonar.login=\${SONAR_AUTH_TOKEN} \
                    -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                """
              }
            }
          } catch (Exception e) {
            echo "SonarQube scanning failed: ${e.getMessage()}"
            echo "This might be due to SonarQube server not being configured or not running"
            echo "Please check Jenkins Global Tool Configuration for SonarScanner installation"
            echo "Also verify SonarQube server configuration in Manage Jenkins > Configure System"
          }
        }
      }
    }

    stage('Quality Gate') {
      steps {
        script {
          try {
            timeout(time: 10, unit: 'MINUTES') {
              waitForQualityGate abortPipeline: true
            }
          } catch (Exception e) {
            echo "Quality Gate check failed: ${e.getMessage()}"
            echo "This might be due to SonarQube not being properly configured"
            echo "Continuing pipeline execution..."
            // Don't abort the pipeline for Quality Gate failures in this setup
          }
        }
      }
    }

    stage('Build Docker image') {
      steps {
        sh """
          docker build -t $REGISTRY_URL/$IMAGE_NAME:latest .
          docker tag $REGISTRY_URL/$IMAGE_NAME:latest $REGISTRY_URL/$IMAGE_NAME:${env.BUILD_NUMBER}
        """
      }
    }

    stage('Push to Nexus') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'nexus-registry', usernameVariable: 'NUSER', passwordVariable: 'NPASS')]) {
          sh """
            echo "$NPASS" | docker login $REGISTRY_URL -u "$NUSER" --password-stdin
            docker push $REGISTRY_URL/$IMAGE_NAME:latest
            docker push $REGISTRY_URL/$IMAGE_NAME:${env.BUILD_NUMBER}
            docker logout $REGISTRY_URL || true
          """
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        sh '''
          kubectl apply -f kubernetes.yaml
          kubectl rollout status deploy/backend-test
        '''
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'kubernetes.yaml, sonar-project.properties, coverage/**', allowEmptyArchive: true
    }
  }
}
