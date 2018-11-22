const path = require('path');
const webpack = require('webpack');


module.exports = {
    entry: './src/main.js',
    output: {
        path: path.resolve(__dirname, './dist'),
        publicPath: '/dist/',
        filename: 'build.js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.scss$/,
                loader: 'style-loader!css-loader!sass-loader',
            },
            {
                test: /\.(png|jpe?g|gif)(\?.*)?$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'static/img/',
                    },
                },
            },
            {
                test: /\.(woff|woff2|eot|ttf)$/,
                use: {
                    loader: 'url-loader',
                },
            },
        ],
    },
    devServer: {
        historyApiFallback: true,
        noInfo: true,
        overlay: true,
        disableHostCheck: true,
        port: 8080,
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify(process.env.NODE_ENV),
            },
        }),
    ],
};


if (process.env.NODE_ENV === 'production') {
    module.exports.plugins = (module.exports.plugins || []).concat([
        new webpack.LoaderOptionsPlugin({
            minimize: true,
        }),
    ]);
}
