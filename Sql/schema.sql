
/****** Object:  UserDefinedTableType [dbo].[UDT_IdList]    Script Date: 1/28/2016 4:30:06 PM ******/
CREATE TYPE [dbo].[UDT_IdList] AS TABLE(
	[Id] [varchar](50) NULL
)
GO
/****** Object:  UserDefinedTableType [dbo].[UDT_Relations]    Script Date: 1/28/2016 4:30:06 PM ******/
CREATE TYPE [dbo].[UDT_Relations] AS TABLE(
	[Entity1TypeId] [int] NULL,
	[Entity1Name] [varchar](100) NULL,
	[Entity2TypeId] [int] NULL,
	[Entity2Name] [varchar](100) NULL,
	[Relation] [int] NULL,
	[Score] [real] NULL
)
GO
/****** Object:  Table [dbo].[Documents]    Script Date: 1/28/2016 4:30:06 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[Documents](
	[SourceId] [int] NOT NULL,
	[Id] [varchar](50) NOT NULL,
	[Description] [varchar](1024) NULL,
	[StatusId] [int] NOT NULL,
 CONSTRAINT [PK_Documents_1] PRIMARY KEY CLUSTERED 
(
	[SourceId] ASC,
	[Id] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[DocumentStatus]    Script Date: 1/28/2016 4:30:06 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[DocumentStatus](
	[Id] [int] NOT NULL,
	[Name] [varchar](50) NOT NULL,
 CONSTRAINT [PK_DocumentStatus] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[EntityTypes]    Script Date: 1/28/2016 4:30:06 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[EntityTypes](
	[Id] [int] NOT NULL,
	[Name] [varchar](50) NOT NULL,
 CONSTRAINT [PK_ConceptTypes] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[Graph]    Script Date: 1/28/2016 4:30:06 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[Graph](
	[SourceId] [int] NOT NULL,
	[DocId] [varchar](50) NOT NULL,
	[SentenceIndex] [int] NOT NULL,
	[ModelVersion] [varchar](50) NOT NULL,
	[Entity1TypeId] [int] NOT NULL,
	[Entity1Name] [varchar](100) NOT NULL,
	[Entity2TypeId] [int] NOT NULL,
	[Entity2Name] [varchar](100) NOT NULL,
	[Relation] [int] NOT NULL,
	[Score] [real] NOT NULL,
 CONSTRAINT [PK_Graph] PRIMARY KEY CLUSTERED 
(
	[SourceId] ASC,
	[DocId] ASC,
	[SentenceIndex] ASC,
	[ModelVersion] ASC,
	[Entity1TypeId] ASC,
	[Entity1Name] ASC,
	[Entity2TypeId] ASC,
	[Entity2Name] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[Sentences]    Script Date: 1/28/2016 4:30:06 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[Sentences](
	[SourceId] [int] NOT NULL,
	[DocId] [varchar](50) NOT NULL,
	[SentenceIndex] [int] NOT NULL,
	[Sentence] [text] NOT NULL,
 CONSTRAINT [PK_Sentences] PRIMARY KEY CLUSTERED 
(
	[SourceId] ASC,
	[DocId] ASC,
	[SentenceIndex] ASC
)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[Sources]    Script Date: 1/28/2016 4:30:06 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[Sources](
	[Id] [int] NOT NULL,
	[name] [varchar](50) NOT NULL,
	[Url] [varchar](1024) NULL,
 CONSTRAINT [PK_Sources] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
ALTER TABLE [dbo].[Documents] ADD  CONSTRAINT [DF_Documents_StatusId]  DEFAULT ((1)) FOR [StatusId]
GO
ALTER TABLE [dbo].[Documents]  WITH CHECK ADD  CONSTRAINT [FK_Documents_DocumentStatus] FOREIGN KEY([StatusId])
REFERENCES [dbo].[DocumentStatus] ([Id])
GO
ALTER TABLE [dbo].[Documents] CHECK CONSTRAINT [FK_Documents_DocumentStatus]
GO
ALTER TABLE [dbo].[Documents]  WITH CHECK ADD  CONSTRAINT [FK_Documents_Sources] FOREIGN KEY([SourceId])
REFERENCES [dbo].[Sources] ([Id])
GO
ALTER TABLE [dbo].[Documents] CHECK CONSTRAINT [FK_Documents_Sources]
GO
ALTER TABLE [dbo].[Graph]  WITH CHECK ADD  CONSTRAINT [FK_Graph_Entity2Types] FOREIGN KEY([Entity2TypeId])
REFERENCES [dbo].[EntityTypes] ([Id])
GO
ALTER TABLE [dbo].[Graph] CHECK CONSTRAINT [FK_Graph_Entity2Types]
GO
ALTER TABLE [dbo].[Graph]  WITH CHECK ADD  CONSTRAINT [FK_Graph_EntityTypes1] FOREIGN KEY([Entity1TypeId])
REFERENCES [dbo].[EntityTypes] ([Id])
GO
ALTER TABLE [dbo].[Graph] CHECK CONSTRAINT [FK_Graph_EntityTypes1]
GO
ALTER TABLE [dbo].[Graph]  WITH CHECK ADD  CONSTRAINT [FK_Graph_Sentences] FOREIGN KEY([SourceId], [DocId], [SentenceIndex])
REFERENCES [dbo].[Sentences] ([SourceId], [DocId], [SentenceIndex])
GO
ALTER TABLE [dbo].[Graph] CHECK CONSTRAINT [FK_Graph_Sentences]
GO
ALTER TABLE [dbo].[Sentences]  WITH CHECK ADD  CONSTRAINT [FK_Sentences_Documents] FOREIGN KEY([SourceId], [DocId])
REFERENCES [dbo].[Documents] ([SourceId], [Id])
GO
ALTER TABLE [dbo].[Sentences] CHECK CONSTRAINT [FK_Sentences_Documents]
GO
/****** Object:  StoredProcedure [dbo].[FilterExistingDocuments]    Script Date: 1/28/2016 4:30:06 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		amitu
-- Description:	Filter document Ids, returning Ids that are not found

/*
-- define an instance of your user-defined table type
DECLARE @udtIds UDT_IdList

-- fill some values into that table
INSERT INTO @udtIds VALUES('One'), ('Two'), ('Three'), ('aaaaa1')

-- call your stored proc
DECLARE @return_value int
EXEC    @return_value = [FilterExistingDocuments]
        @Ids = @udtIds   -- pass in that UDT table type here!

-- SELECT  'Return Value' = @return_value
GO
*/

-- =============================================
CREATE PROCEDURE [dbo].[FilterExistingDocuments]
	@SourceId int,
	@Ids UDT_IdList READONLY
AS
BEGIN

	SET NOCOUNT ON;
	
	SELECT i.Id FROM @Ids i
	LEFT JOIN Documents d
	ON d.SourceId = @SourceId AND i.Id = d.Id
	WHERE d.Id IS NULL

END




GO
/****** Object:  StoredProcedure [dbo].[UpdateDocumentStatus]    Script Date: 1/28/2016 4:30:06 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[UpdateDocumentStatus]
	@SourceId int,
	@DocumentId VARCHAR(50),
	@StatusId int
AS
BEGIN

	SET NOCOUNT ON;
	
	UPDATE Documents
	SET StatusId = @StatusId
	WHERE StatusId = @StatusId AND Id = @DocumentId

END

GO
/****** Object:  StoredProcedure [dbo].[UpsertDocument]    Script Date: 1/28/2016 4:30:06 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		amitu
-- Description:	Merge a document
-- =============================================
CREATE PROCEDURE [dbo].[UpsertDocument]
	@SourceId int,
	@Id varchar(50),
	@Description varchar(1024),
	@StatusId int
AS
BEGIN

	SET NOCOUNT ON;

	MERGE 
	   Documents
	USING ( 
		VALUES (@SourceId, @Id, @Description, @StatusId)
	) AS source (SourceId, Id, Description, StatusId) 
	ON Documents.SourceId = source.SourceId AND Documents.Id = source.Id 
	WHEN MATCHED THEN
	   UPDATE SET Description = source.Description, StatusId = source.StatusId
	WHEN NOT MATCHED THEN
	   INSERT (SourceId, Id, Description, StatusId)
	   VALUES (SourceId, Id, Description, StatusId)
	; --A MERGE statement must be terminated by a semi-colon (;).

END

GO
/****** Object:  StoredProcedure [dbo].[UpsertRelation]    Script Date: 1/28/2016 4:30:06 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		amitu
-- Description:	Merge a sentence relations
-- =============================================
CREATE PROCEDURE [dbo].[UpsertRelation]
	@SourceId int,
    @DocId varchar(50),
    @SentenceIndex int,
    @relations UDT_Relations READONLY,
    @ModelVersion varchar(50),
    @Sentence text

AS
BEGIN

	SET NOCOUNT ON;
	BEGIN TRANSACTION T1

	-- TODO REMOVE AFTER IMPLEMENTATION
	IF NOT EXISTS (SELECT * FROM Documents WHERE Id = @DocId)
	BEGIN
		INSERT INTO Documents VALUES (@SourceId, @DocId, 'temporary record', 1)
	END


	IF NOT EXISTS (SELECT * FROM Sentences WHERE SourceId = @SourceId AND DocId = @DocId AND SentenceIndex = @SentenceIndex)
	BEGIN
		INSERT INTO Sentences VALUES (@SourceId, @DocId, @SentenceIndex, @Sentence)
	END
	

	-- delete previous relations for this sentence if any
	DELETE FROM Graph 
	WHERE Graph.SourceId = @SourceId 
		AND Graph.DocId = @DocId 
		AND Graph.SentenceIndex = @SentenceIndex
		AND ModelVersion = @ModelVersion

	-- insert updated relations
	INSERT INTO Graph 
	SELECT @SourceId, @DocId, @SentenceIndex, @ModelVersion, r.Entity1TypeId, r.Entity1Name, r.Entity2TypeId, r.Entity2Name, r.Relation, r.Score
	FROM @relations r
	

	/*
	MERGE Graph 
	USING ( SELECT @SourceId, @DocId, @SentenceIndex, r.Entity1TypeId, r.Entity1Name, r.Entity2TypeId, r.Entity2Name, r.Relation, r.Score, @ModelVersion
			FROM @relations r) 
	AS source (SourceId, DocId, SentenceIndex, Entity1TypeId, Entity1Name, Entity2TypeId, Entity2Name, Relation, Score, ModelVersion) 
	ON	Graph.SourceId = source.SourceId 
		AND Graph.DocId = source.DocId 
		AND Graph.SentenceIndex = source.SentenceIndex
		AND Graph.Entity1TypeId = source.Entity1TypeId
		AND Graph.Entity1Name = source.Entity1Name
		AND Graph.Entity2TypeId = source.Entity2TypeId
		AND Graph.Entity2Name = source.Entity2Name
	WHEN MATCHED THEN
	   UPDATE SET Relation = source.Relation, Score = source.Score, ModelVersion = source.ModelVersion
	WHEN NOT MATCHED THEN
	   INSERT (SourceId, DocId, SentenceIndex, Entity1TypeId, Entity1Name, Entity2TypeId, Entity2Name, Relation, Score, ModelVersion)
	   VALUES (SourceId, DocId, SentenceIndex, Entity1TypeId, Entity1Name, Entity2TypeId, Entity2Name, Relation, Score, ModelVersion)
	; --A MERGE statement must be terminated by a semi-colon (;).
	*/

	COMMIT TRANSACTION T1

	RETURN 1;

END
GO



INSERT INTO DocumentStatus (Id,Name) VALUES (1, 'Processing')
INSERT INTO DocumentStatus (Id,Name) VALUES (2, 'Scoring')
INSERT INTO DocumentStatus (Id,Name) VALUES (3, 'Processed')

INSERT INTO Sources (Id ,name ,Url) VALUES (1, 'Pubmed', 'http://pubmed.com')
INSERT INTO Sources (Id ,name ,Url) VALUES (2, 'PMC', 'http://pmc.com')

INSERT INTO EntityTypes (Id, Name) VALUES (1, 'Gene')
INSERT INTO EntityTypes (Id, Name) VALUES (2, 'Mirna')
INSERT INTO EntityTypes (Id, Name) VALUES (3, 'Species')
INSERT INTO EntityTypes (Id, Name) VALUES (4, 'Chemical')
INSERT INTO EntityTypes (Id, Name) VALUES (5, 'Other')

