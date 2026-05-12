from abc import ABC, abstractmethod

class AuthStrategy(ABC):
    @abstractmethod
    async def login(self):
        pass
