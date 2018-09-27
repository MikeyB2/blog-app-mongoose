'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const expect = chai.expect;

const {
    BlogPost
} = require('../models');
const {
    closeServer,
    runServer,
    app
} = require('../server');
const {
    TEST_DATABASE_URL
} = require('../config');

chai.use(chaiHttp);

// delete the database after each function
function tearDownDb() {
    return new Promise((resolve, reject) => {
        console.warn('Deleting database');
        mongoose.connection.dropDatabase()
            .then(result => resolve(result))
            .catch(err => reject(err));
    });
}


// create seed data
function seedBlogPostData() {
    console.info('seeding blog post data');
    const seedData = [];
    for (let i = 1; i <= 10; i++) {
        seedData.push({
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName()
            },
            title: faker.lorem.sentence(),
            content: faker.lorem.text()
        });
    }
    return BlogPost.insertMany(seedData);
}


describe('blog posts API resource', function () {

    before(function () {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function () {
        return seedBlogPostData();
    });

    afterEach(function () {});

    after(function () {
        return closeServer();
    });

    // beginning of testing
    describe('GET endpoint', function () {

        it('should return all existing posts', function () {
            // strategy:
            //    1. need to get back all posts returned by by GET request to `/posts`
            //    2. confirm res has right status, data type
            //    3. prove the number of posts we got back is equal to number
            //       in db.
            let res;
            return chai.request(app)
                .get('/posts')
                .then(function (_res) {
                    res = _res;
                    expect(res).to.have.status(200);
                    console.log("TESTING TEST:" + res.body.blogPosts);
                    expect(res.body.blogPosts).to.have.lengthOf.at.least(1);

                    return BlogPost.count();
                })
                .then(count => {
                    expect(res.body.blogPosts).to.have.lengthOf(count);
                });
        });

        it('should return posts with right fields', function () {
            // Strategy: Get back all posts, and ensure they have expected keys

            let resPost;
            return chai.request(app)
                .get('/posts')
                .then(function (res) {

                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    console.log('BODY TESTING:' + res.body.blogPosts)
                    expect(res.body.blogPosts).to.be.a('array');
                    expect(res.body.blogPosts).to.have.lengthOf.at.least(1);

                    res.body.blogPosts.forEach(function (post) {
                        expect(post).to.be.a('object');
                        expect(post).to.include.keys('id', 'title', 'content', 'author', 'created');
                    });
                    // check to make sure response data matches db data
                    resPost = res.body.blogPosts[0];
                    return BlogPost.findById(resPost.id);
                })
                .then(post => {
                    expect(resPost.title).to.equal(post.title);
                    expect(resPost.content).to.equal(post.content);
                    expect(resPost.author).to.equal(post.authorName);
                });
        });
    });

    describe('POST endpoint', function () {
        // make a post request and get the data back
        it('should add a new blog post', function () {

            const newPost = {
                title: faker.lorem.sentence(),
                author: {
                    firstName: faker.name.firstName(),
                    lastName: faker.name.lastName(),
                },
                content: faker.lorem.text()
            };

            return chai.request(app)
                .post('/posts')
                .send(newPost)
                .then(function (res) {
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('object');
                    expect(res.body).to.include.keys(
                        'id', 'title', 'content', 'author', 'created');
                    expect(res.body.title).to.equal(newPost.title);
                    expect(res.body.id).to.not.be.null;
                    expect(res.body.author).to.equal(
                        `${newPost.author.firstName} ${newPost.author.lastName}`);
                    expect(res.body.content).to.equal(newPost.content);
                    return BlogPost.findById(res.body.id);
                })
                .then(function (post) {
                    expect(post.title).to.equal(newPost.title);
                    expect(post.content).to.equal(newPost.content);
                    expect(post.author.firstName).to.equal(newPost.author.firstName);
                    expect(post.author.lastName).to.equal(newPost.author.lastName);
                });
        });
    });

    describe('PUT endpoint', function () {

        // strategy:
        //  need to get a post from the db
        // update that post fromt he id
        // check data
        it('should update fields you send over', function () {
            const updateData = {
                title: 'cats cats cats',
                content: 'dogs dogs dogs',
                author: {
                    firstName: 'foo',
                    lastName: 'bar'
                }
            };

            return BlogPost
                .findOne()
                .then(post => {
                    updateData.id = post.id;

                    return chai.request(app)
                        .put(`/posts/${post.id}`)
                        .send(updateData);
                })
                .then(res => {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(updateData.id);
                })
                .then(post => {
                    expect(post.title).to.equal(updateData.title);
                    expect(post.content).to.equal(updateData.content);
                    expect(post.author.firstName).to.equal(updateData.author.firstName);
                    expect(post.author.lastName).to.equal(updateData.author.lastName);
                });
        });
    });

    describe('DELETE endpoint', function () {
        // strategy:
        //  get a post to retreive the id
        // delete that id
        it('should delete a post by id', function () {

            let post;

            return BlogPost
                .findOne()
                .then(_post => {
                    post = _post;
                    return chai.request(app).delete(`/posts/${post.id}`);
                })
                .then(res => {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(post.id);
                })
                .then(_post => {
                    expect(_post).to.be.null;
                });
        });
    });
});