FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY image-service.csproj .
RUN dotnet restore image-service.csproj
COPY . .
RUN dotnet publish image-service.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8085
EXPOSE 8085
ENTRYPOINT ["dotnet", "image-service.dll"]
