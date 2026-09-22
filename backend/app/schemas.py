from typing import List
from pydantic import BaseModel, Field


class CompareRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=20000)
    systemPrompt: str = Field("", max_length=20000)
    modelIds: List[str] = Field(..., min_length=1)
    stream: bool = True
    modality: str = Field("text")
    videoResolution: str = Field("720P", pattern=r"^(720P|1080P)$")
    videoDuration: int = Field(5, ge=1, le=30)


from .endpoints import service_address
from pydantic import field_validator


class ModelConnection(BaseModel):
    id: str = Field(min_length=1, max_length=200, pattern=r"^connection:")
    name: str = Field(min_length=1, max_length=200)
    provider: str = Field(default="自定义", max_length=200)
    modelId: str = Field(min_length=1, max_length=200)
    connectionName: str = Field(min_length=1, max_length=200)
    baseUrl: str = Field(min_length=1, max_length=2000)
    apiKey: str | None = Field(default=None, max_length=8192, repr=False)
    inheritFrom: str | None = None

    @field_validator("name", "modelId", "connectionName")
    @classmethod
    def nonempty(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("字段不能为空")
        return value

    @field_validator("baseUrl")
    @classmethod
    def service_url(cls, value):
        return service_address(value)


class SettingsRequest(BaseModel):
    keys: dict[str, str] = Field(default_factory=dict)
    connections: list[ModelConnection] = Field(default_factory=list, max_length=9)
