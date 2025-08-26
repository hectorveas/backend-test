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
          junit allowEmptyResults: true, testResults: '**/junit*.xml,**/surefire-reports/*.xml'
        }
      }
    }

    stage('Build app') {
      steps { sh 'npm run build || echo "skip build"' }
    }

    stage('SonarQube Scan') {
      steps {
        withSonarQubeEnv("${env.SONAR_SERVER}") {
          script {
            def scannerHome = tool "${env.SONAR_SCANNER}"
            sh """
              ${scannerHome}/bin/sonar-scanner
            """
          }
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 10, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
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
