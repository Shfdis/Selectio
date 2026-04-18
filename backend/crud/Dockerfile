FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8090

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["crud.csproj", "./"]
RUN dotnet restore "crud.csproj"
COPY . .
WORKDIR "/src"
RUN dotnet build "crud.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "crud.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "crud.dll"]
