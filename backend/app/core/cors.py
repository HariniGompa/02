from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from .config import settings

def add_cors_middleware(app: FastAPI):
    """
    Add CORS middleware to the FastAPI application.
    
    Args:
        app: FastAPI application instance
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add CORS headers to all responses
    @app.middleware("http")
    async def add_cors_headers(request, call_next):
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = ", ".join(settings.BACKEND_CORS_ORIGINS)
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
