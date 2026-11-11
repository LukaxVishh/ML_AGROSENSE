"""Registro dos blueprints HTTP da API."""

from flask import Flask

from app.routes.data import data_blueprint
from app.routes.health import health_blueprint
from app.routes.predict import predict_blueprint
from app.routes.train import train_blueprint


def register_routes(app: Flask) -> None:
    app.register_blueprint(health_blueprint, url_prefix="/api")
    app.register_blueprint(data_blueprint, url_prefix="/api")
    app.register_blueprint(train_blueprint, url_prefix="/api")
    app.register_blueprint(predict_blueprint, url_prefix="/api")
