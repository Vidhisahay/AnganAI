import os
import logging

from pathlib import Path
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv(Path(__file__).parent / ".env")

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AnganAI")

# LLM
def get_llm(schema=None):
    llm = ChatGroq(
        model=os.getenv("MODEL_NAME"),
        temperature=0,
        api_key=os.getenv("GROQ_API_KEY"),
    )

    if schema:
        return llm.with_structured_output(schema)

    return llm