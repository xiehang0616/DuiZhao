from typing import List
from pydantic import BaseModel, Field


class CompareRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=20000)
    systemPrompt: str = Field("", max_length=20000)
    modelIds: List[str] = Field(..., min_length=1)
    stream: bool = True
