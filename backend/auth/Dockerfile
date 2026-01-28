FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["auth.csproj", "./"]
RUN dotnet restore "auth.csproj"
COPY . .
WORKDIR "/src"
RUN dotnet build "auth.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "auth.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
# Install sqlite3 for test database queries
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "auth.dll"]
