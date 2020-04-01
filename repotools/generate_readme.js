const fs = require("fs");
const { Transform, PassThrough } = require('stream');
const glob = require('glob');


class AddRepoLink extends Transform {
    constructor(options) {
      super(options);
      this.link = options.link;
    }
    _transform(data, encoding, callback) {
      if (this.link)
        this.push(`\n# [Jump to ${this.link}](${this.link})`);
      this.push(data);
      callback();
    }
  }

class AddEndOfLine extends Transform {
  constructor(options) {
    super(options);
  }
  _transform(data, encoding, callback) {
    this.push(data);
    this.push("\n\n");
    callback();
  }
}

// Convert
//  ![test1](./myImage1.png)
// to
//  ![image](/download/attachments/37064693/myImage1.png)
class RebaseImages extends Transform {
  constructor(options) {
    super(options);
  }
  _transform(data, encoding, callback) {
    const pattern = /!\[.+\]\(\.(\/.+\.png)\)/g;
    const replace = "![image](/download/attachments/37064693$1)";

    const newData = data.toString()
      .replace(pattern, replace);

    this.push(newData);

    callback();
  }
}

// Convert
//  [a b c](./b.md)
// to
//  [a b c](#doc-abc)
class ConvertLinksToAnchors extends Transform {
  constructor(options) {
    super(options);
  }
  _transform(data, encoding, callback) {
    const pattern = /\[(.+)\]\(\.\/(.+\.md)\)/g;

    const newData = data.toString()
      .replace(pattern, (m, p1, p2) => {
        const anchor = p1.replace(/\s/g, "");
        return `[${p1}](#doc-${anchor})`;
      });

    this.push(newData);

    callback();
  }
}

function directory(path) {
    try {return path.match(/^(.*)_header_\/.*$/)[1]} catch {};
    return path.match(/(?<dir>.*)\/[^/]*/)[1];
}

glob('*/**/*.md', (err, files) => {
    const outPath = "./README.md";
    const output = fs.createWriteStream(outPath);

    var work = Promise.resolve();
    // Add each section
    files.map(file => {
        work = work.then(() => new Promise( (resolve) => {
            console.log(file);
            fs.createReadStream(file)
                .pipe(new AddRepoLink({
                    link: directory(file)
                }))
                .pipe(new AddEndOfLine())
                .pipe(new RebaseImages())
                .pipe(new ConvertLinksToAnchors())
                .on("finish", (err) => resolve())
                .pipe(output, {end: false})
        }));
    });
});