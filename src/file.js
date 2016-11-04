import _ from 'lodash'
import MagisterThing from './magisterThing'
import Person from './person'
import * as util from './util'

/**
 * @extends MagisterThing
 * @private
 */
class File extends MagisterThing {
	/**
	 * @param {Magister} magister
	 * @param {FileFolder} fileFolder
	 * @param {Object} raw
	 */
	constructor(magister, fileFolder, raw) {
		super(magister)

		/**
		 * @type String
		 * @readonly
		 */
		this.id = raw.Id.toString()
		/**
		 * @type Number
		 * @readonly
		 */
		this.type = raw.BronSoort // REVIEW: string?
		/**
		 * @type String
		 * @readonly
		 */
		this.name = raw.Naam
		/**
		 * @type String
		 * @readonly
		 */
		this.uri = raw.Uri
		/**
		 * @type Number
		 * @readonly
		 */
		this.size = raw.Grootte
		// REVIEW
		/**
		 * @type Number
		 * @readonly
		 */
		this.rights = raw.Privilege
		/**
		 * @type String
		 * @readonly
		 */
		this.mime = raw.ContentType

		/**
		 * @type Date
		 * @readonly
		 */
		this.changedDate = util.parseDate(raw.GewijzigdOp)
		/**
		 * @type Date
		 * @readonly
		 */
		this.creationDate = util.parseDate(raw.GemaaktOp || raw.Datum)

		/**
		 * @type Person
		 * @readonly
		 */
		this.addedBy = (function () {
			const p = new Person(magister, null, '', '')
			p.fullName = raw.GeplaatstDoor
			return p
		})()

		/**
		 * @type String
		 * @readonly
		 */
		this.fileBlobId = util.toString(raw.FileBlobId)
		/**
		 * @type FileFolder
		 * @readonly
		 */
		this.fileFolder = fileFolder
		/**
		 * @type String
		 * @readonly
		 */
		this.uniqueId = raw.UniqueId
		/**
		 * @type String
		 * @readonly
		 */
		this.referenceId = util.toString(raw.Referentie)

		const fullUrl = url => {
			url = url.Href
			return /^https?/.test(url) ? url : magister.school.url + url
		}

		const selfUrl = _.find(raw.Links, { Rel: 'Self' })
		const contentUrl = _.find(raw.Links, { Rel: 'Contents' })

		/**
		 * @type String
		 * @readonly
		 * @private
		 */
		this._selfUrl = fullUrl(selfUrl)
		/**
		 * @type String
		 * @readonly
		 * @private
		 */
		this._downloadUrl = fullUrl(contentUrl || selfUrl)
	}

	/**
	 * Opens a stream to the current file
	 * @return {Promise<Stream>}
	 */
	download() {
		return this._magister.get(this._downloadUrl)
		.then(res => res.body)
	}

	/**
	 * Removes the current file permanently
	 * @return {Promise<undefined>}
	 */
	remove() {
		return this._magister._privileges.needs('bronnen', 'delete')
		.then(() => this._magister.http.delete(this._selfUrl))
		.then(() => undefined) // throw away the useless result from magister. (current object)
	}

	/**
	 * Update the server to reflect the changes made on the properties of this
	 * File instance.
	 * @return {Promise<undefined>}
	 */
	saveChanges() {
		return this._magister._privileges.needs('bronnen', 'update')
		.then(() => this._magister.http.put(this._selfUrl, this._toMagister()))
		.then(() => undefined)
	}

	/**
	 * @private
	 * @return {Object}
	 */
	_toMagister() {
		const toNumberSafe = val => val == null ? val : parseInt(val, 10)

		return {
			Id: parseInt(this.id, 10),
			BronSoort: this.type,
			Naam: this.name,
			Uri: this.uri,
			Grootte: this.size,
			Privilege: this.rights,
			ContentType: this.mime,
			FileBlobId: toNumberSafe(this.fileBlobId),
			ParentId: this.fileFolder.id,
			UniqueId: this.uniqueId,
			Referentie: toNumberSafe(this.referenceId),
		}
	}
}

export default File
