from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import api_router
from app.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Taiwan Stock Dashboard API",
    description="API for Taiwan Stock Dashboard",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
def root():
    return {"message": "Taiwan Stock Dashboard API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}