use serde::{Deserialize, Serialize};
use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};

#[derive(Deserialize)]
struct ApiRequest {
    task: String,
    input: String,
}

#[derive(Serialize)]
struct ApiResponse {
    suggestion: String,
}

#[derive(Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct OpenAIResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: MessageResponse,
}

#[derive(Deserialize)]
struct MessageResponse {
    content: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

async fn process_text(task: &str, input: &str) -> Result<String, String> {
    let api_key =
        std::env::var("OPENAI_API_KEY").map_err(|_| "OPENAI_API_KEY not set".to_string())?;

    let prompt = match task {
        "paraphrasing" => format!(
            "Paraphrase the following text while maintaining its original meaning:\n\n{}",
            input
        ),
        "expanding" => format!(
            "Expand the following text with more details and elaboration:\n\n{}",
            input
        ),
        "summarising" => format!(
            "Summarise the following text in a concise way:\n\n{}",
            input
        ),
        _ => {
            return Err(
                "Invalid task. Use 'paraphrasing', 'expanding', or 'summarising'".to_string(),
            )
        }
    };

    let openai_request = OpenAIRequest {
        model: "gpt-4o-mini".to_string(),
        messages: vec![
            Message {
                role: "system".to_string(),
                content:
                    "You are a helpful assistant that helps with text editing and transformation."
                        .to_string(),
            },
            Message {
                role: "user".to_string(),
                content: prompt,
            },
        ],
        temperature: 0.7,
    };

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&openai_request)
        .send()
        .await
        .map_err(|e| format!("Failed to call OpenAI API: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error ({}): {}", status, error_text));
    }

    let openai_response: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse OpenAI response: {}", e))?;

    openai_response
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .ok_or_else(|| "No response from OpenAI".to_string())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(handler).await
}

pub async fn handler(req: Request) -> Result<Response<Body>, Error> {
    // Parse request body
    let body_bytes = req.body().to_vec();

    if body_bytes.is_empty() {
        let error = ErrorResponse {
            error: "Empty request body".to_string(),
        };
        return Ok(Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header("Content-Type", "application/json")
            .body(serde_json::to_string(&error)?.into())?);
    }

    let api_request: ApiRequest = match serde_json::from_slice(&body_bytes) {
        Ok(req) => req,
        Err(e) => {
            let error = ErrorResponse {
                error: format!("Invalid JSON: {}", e),
            };
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .header("Content-Type", "application/json")
                .body(serde_json::to_string(&error)?.into())?);
        }
    };

    // Validate task
    if api_request.task != "paraphrasing"
        && api_request.task != "expanding"
        && api_request.task != "summarising"
    {
        let error = ErrorResponse {
            error: "Invalid task. Use 'paraphrasing', 'expanding', or 'summarising'".to_string(),
        };
        return Ok(Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header("Content-Type", "application/json")
            .body(serde_json::to_string(&error)?.into())?);
    }

    // Process the request
    match process_text(&api_request.task, &api_request.input).await {
        Ok(suggestion) => {
            let response = ApiResponse { suggestion };
            Ok(Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", "application/json")
                .body(serde_json::to_string(&response)?.into())?)
        }
        Err(e) => {
            let error = ErrorResponse { error: e };
            Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header("Content-Type", "application/json")
                .body(serde_json::to_string(&error)?.into())?)
        }
    }
}
