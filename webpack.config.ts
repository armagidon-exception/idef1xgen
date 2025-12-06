import path from "path";
import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import type { Configuration as DevServerConfiguration } from "webpack-dev-server";

import "webpack-dev-server";

type Mode = "production" | "development";

interface EnvVariables {
  mode: Mode;
  port: number;
}

export default function (env: EnvVariables): webpack.Configuration {
  return {
    mode: env.mode ?? "development",
    entry: {
      main: path.resolve(__dirname, "src", "index.ts"),
      elementBuilder: path.resolve(__dirname, "src", "elementBuilder.ts"),
    },
    resolve: { extensions: [".js", ".ts", ".tsx"] },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf|svg)$/i,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "src", "index.html"),
      }) as webpack.WebpackPluginInstance,
    ].concat(env.mode === "development" ? [new webpack.ProgressPlugin()] : []),
    output: {
      path: path.resolve(__dirname, "build"),
      filename: "[name].[contenthash].js",
      clean: true,
    },
    devServer: env.mode === "development" && {
      port: env.port ?? 8000,
      open: true,
    },
    devtool: env.mode === "development" && "inline-source-map",
  };
}
