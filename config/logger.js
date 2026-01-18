module.exports = ({ env, level, message }) => {
    // log dependent on environment
    if (env !== 'prod') {
        console.log(message);
    }
}